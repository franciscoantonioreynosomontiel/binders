$(document).ready(async function() {
    if ($.isTouch === undefined) {
        $.isTouch = 'ontouchstart' in window;
    }

    // Check if we are in public view
    const urlParams = new URLSearchParams(window.location.search);
    const storeName = urlParams.get('store');

    let query = _supabase.from('albums').select('*');

    if (storeName) {
        // Find user by store name
        const { data: userData, error: userError } = await _supabase
            .from('usuarios')
            .select('id, store_name')
            .eq('store_name', storeName)
            .single();

        if (userError || !userData) {
            console.error('Store not found:', storeName);
            $('#albums-container').html('<div class="error">Tienda no encontrada.</div>');
            return;
        }

        $('#public-store-name').text(`Tienda: ${userData.store_name}`);
        query = query.eq('user_id', userData.id);
    } else {
        // If no store param, just hide the title if it exists
        $('#public-store-name').hide();
    }

    const { data: albums, error: albumError } = await query.order('id', { ascending: true });

    if (albumError) {
        console.error('Error fetching albums:', albumError);
        $('#albums-container').html('<div class="error">Error al cargar álbumes.</div>');
        return;
    }

    if (albums.length === 0) {
        $('#albums-container').html('<div class="empty">No hay álbumes disponibles en esta tienda.</div>');
        return;
    }

    $('#albums-container').empty();

    for (const album of albums) {
        await renderAlbum(album);
    }

    // Modal logic
    $(document).on("click", ".card-slot", function() {
        const $slot = $(this);
        const imgSrc = $slot.find("img").attr("src");
        
        if (!imgSrc || imgSrc.includes('placeholder')) return;

        const name = $slot.data("name") || "Carta de Colección";
        const rarity = $slot.data("rarity") || "-";
        const expansion = $slot.data("expansion") || "-";
        const condition = $slot.data("condition") || "-";
        const quantity = $slot.data("quantity") || "1";
        const price = $slot.data("price") || "-";

        $("#expanded-image").attr("src", imgSrc);
        $("#card-name").text(name);
        $("#card-rarity").text(rarity);
        $("#card-expansion").text(expansion);
        $("#card-condition").text(condition);
        $("#card-quantity").text(quantity);
        $("#card-price").text(price);

        $("#image-overlay").addClass("active");
    });

    $(document).on("click", "#close-btn, #image-overlay", function(e) {
        if (e.target === this || $(this).attr('id') === 'close-btn') {
            $("#image-overlay").removeClass("active");
        }
    });
});

async function renderAlbum(album) {
    const $albumContainer = $(`
        <div class="public-album-item">
            <div class="public-album-header">
                <i class="fas fa-book-open"></i> ${album.title}
            </div>
            <div class="album-wrapper">
                <div id="album-${album.id}" class="album"></div>
            </div>
        </div>
    `);
    
    const $albumDiv = $albumContainer.find('.album');
    $('#albums-container').append($albumContainer);

    // Fetch pages for this album
    const { data: pages, error: pageError } = await _supabase
        .from('pages')
        .select('*')
        .eq('album_id', album.id)
        .order('page_index', { ascending: true });

    if (pageError) {
        console.error(`Error fetching pages for album ${album.id}:`, pageError);
        return;
    }

    // Front cover page
    const coverImg = album.cover_image_url || 'https://via.placeholder.com/600x840?text=Portada';
    const $coverPage = $(`
        <div class="page cover-page">
            <img src="${coverImg}" alt="${album.title}">
        </div>
    `);
    $albumDiv.append($coverPage);

    // Regular pages
    for (const page of pages) {
        const $pageDiv = $('<div class="page"></div>');
        const $grid = $('<div class="grid-container"></div>');
        
        // Fetch card slots for this page
        const { data: slots, error: slotError } = await _supabase
            .from('card_slots')
            .select('*')
            .eq('page_id', page.id)
            .order('slot_index', { ascending: true });

        if (slotError) {
            console.error(`Error fetching slots for page ${page.id}:`, slotError);
        }

        // Create 9 slots
        for (let i = 0; i < 9; i++) {
            const slotData = slots ? slots.find(s => s.slot_index === i) : null;
            const $slot = $('<div class="card-slot"></div>');
            
            // Prevent Turn.js from catching the click on the card slot
            // We stop mousedown and touchstart to prevent turn.js from starting a flip,
            // but we let click bubble up for the modal logic.
            $slot.on("mousedown touchstart", function(e) {
                e.stopPropagation();
            });

            if (slotData) {
                $slot.attr('data-name', slotData.name || '');
                $slot.attr('data-rarity', slotData.rarity || '');
                $slot.attr('data-expansion', slotData.expansion || '');
                $slot.attr('data-condition', slotData.condition || '');
                $slot.attr('data-quantity', slotData.quantity || '');
                $slot.attr('data-price', slotData.price || '');
                
                if (slotData.image_url) {
                    $slot.append(`<img src="${slotData.image_url}" class="tcg-card">`);
                }
            }
            
            $grid.append($slot);
        }

        $pageDiv.append($grid);
        $albumDiv.append($pageDiv);
    }

    // Back cover
    const totalPagesIncludingCover = pages.length + 1;
    if (totalPagesIncludingCover % 2 !== 0) {
        const backImg = album.back_image_url || 'https://via.placeholder.com/600x840?text=Contraportada';
        const $backPage = $(`
            <div class="page cover-page">
                <img src="${backImg}" alt="Back Cover">
            </div>
        `);
        $albumDiv.append($backPage);
    }

    // Initialize turn.js after images are loaded or after a timeout
    const $images = $albumDiv.find('img');
    let loadedCount = 0;
    const totalImages = $images.length;
    let turnInitialized = false;

    const initTurn = () => {
        if (turnInitialized) return;
        turnInitialized = true;

        const isMobile = window.innerWidth <= 640;

        let width = 600;
        let height = 420;
        let display = 'double';

        if (isMobile) {
            display = 'double';
            // Use nearly 100% of the container width to maximize space for the 6 columns
            const containerWidth = $albumContainer.width() || window.innerWidth;
            width = containerWidth * 0.98;
            // Maintain 600:420 aspect ratio for the full open folder (two pages)
            height = (width / 600) * 420;
        }

        $albumDiv.turn({
            width: width,
            height: height,
            autoCenter: false,
            gradients: true,
            acceleration: false, // Set to false to prevent displacement issues on some browsers
            display: display,
            elevation: 0,
            duration: 600,
            // Increase corner size on mobile for easier flipping
            cornerSize: isMobile ? 120 : 50,
            when: {
                start: function(event, pageObject, corner) {
                    // If corner is null or undefined, it's a click-to-turn
                    if (!corner) {
                        event.preventDefault();
                    }
                }
            }
        });
    };

    if (totalImages === 0) {
        setTimeout(initTurn, 150);
    } else {
        $images.on('load error', function() {
            loadedCount++;
            if (loadedCount >= totalImages) {
                setTimeout(initTurn, 200);
            }
        });
        // Fallback for slow images
        setTimeout(initTurn, 1500);
    }
}
