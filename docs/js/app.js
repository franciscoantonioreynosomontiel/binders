$(document).ready(async function() {
    if ($.isTouch === undefined) {
        $.isTouch = 'ontouchstart' in window;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const initialView = urlParams.get('view') || 'albums';

    loadStoreData();

    $('.nav-btn').click(function() {
        const view = $(this).data('view');
        switchView(view);
    });

    if (initialView === 'decks') {
        switchView('decks');
    }

    // Drag detection for cards (shared across views if needed)
    let isDraggingCard = false;
    let startX, startY;
    $(document).on("touchstart mousedown", ".card-slot", function(e) {
        isDraggingCard = false;
        const touch = e.originalEvent.touches ? e.originalEvent.touches[0] : e;
        startX = touch.pageX;
        startY = touch.pageY;
    });
    $(document).on("touchmove mousemove", ".card-slot", function(e) {
        const touch = e.originalEvent.touches ? e.originalEvent.touches[0] : e;
        if (Math.abs(touch.pageX - startX) > 5 || Math.abs(touch.pageY - startY) > 5) {
            isDraggingCard = true;
        }
    });

    // Modal logic
    $(document).on("click", ".card-slot", function() {
        if (isDraggingCard) return;
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

async function switchView(view) {
    $('.nav-btn').removeClass('active');
    $(`.nav-btn[data-view="${view}"]`).addClass('active');

    $('.view-section').removeClass('active');
    $(`#${view}-view`).addClass('active');

    if (view === 'albums') {
        $('#public-view-title').text('Colección de Álbumes');
    } else {
        $('#public-view-title').text('Decks de Cartas');
        loadPublicDecks();
    }

    const url = new URL(window.location);
    url.searchParams.set('view', view);
    window.history.pushState({}, '', url);
}

async function loadStoreData() {
    const urlParams = new URLSearchParams(window.location.search);
    const storeName = urlParams.get('store');

    if (!storeName) {
        $('#public-store-name').hide();
        return;
    }

    const { data: userData, error: userError } = await _supabase
        .from('usuarios')
        .select('id, store_name')
        .eq('store_name', storeName)
        .single();

    if (userError || !userData) {
        $('#albums-container').html('<div class="error">Tienda no encontrada.</div>');
        return;
    }

    $('#public-store-name').text(`Tienda: ${userData.store_name}`);

    // Load Albums
    loadPublicAlbums(userData.id);
}

async function loadPublicAlbums(userId) {
    const { data: albums, error } = await _supabase
        .from('albums')
        .select('*')
        .eq('user_id', userId)
        .order('id', { ascending: true });

    if (error) {
        $('#albums-container').html('<div class="error">Error al cargar álbumes.</div>');
        return;
    }

    if (albums.length === 0) {
        $('#albums-container').html('<div class="empty">No hay álbumes disponibles.</div>');
        return;
    }

    $('#albums-container').empty();
    for (const album of albums) {
        await renderAlbum(album);
    }
}

async function loadPublicDecks() {
    const storeName = new URLSearchParams(window.location.search).get('store');
    if (!storeName) return;

    $('#decks-container').html('<div class="loading">Cargando decks...</div>');

    const { data: user } = await _supabase
        .from('usuarios')
        .select('id')
        .eq('store_name', storeName)
        .single();

    if (!user) return;

    const { data: decks, error } = await _supabase
        .from('decks')
        .select(`
            *,
            deck_cards (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error || !decks) {
        $('#decks-container').html('<div class="error">No se pudieron cargar los decks.</div>');
        return;
    }

    $('#decks-container').empty();
    if (decks.length === 0) {
        $('#decks-container').html('<div class="empty">Esta tienda aún no tiene decks públicos.</div>');
        return;
    }

    decks.forEach(deck => {
        const deckId = `deck-swiper-${deck.id}`;
        const $deckItem = $(`
            <div class="deck-public-item">
                <h3>${deck.name}</h3>
                <div class="container">
                    <div class="swiper swiperyg ${deckId}">
                        <div class="swiper-wrapper">
                            ${deck.deck_cards.map(card => `
                                <div class="swiper-slide">
                                    <img src="${card.image_url}" alt="Card" />
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `);

        $('#decks-container').append($deckItem);

        new Swiper(`.${deckId}`, {
            effect: "cards",
            grabCursor: true,
            perSlideOffset: 8,
            perSlideRotate: 2,
            rotate: true,
            slideShadows: true,
        });
    });
}

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

    const { data: pages } = await _supabase
        .from('pages')
        .select('*')
        .eq('album_id', album.id)
        .order('page_index', { ascending: true });

    const coverImg = album.cover_image_url || 'https://via.placeholder.com/600x840?text=Portada';
    $albumDiv.append(`<div class="page cover-page"><img src="${coverImg}"></div>`);

    for (const page of pages) {
        const $pageDiv = $('<div class="page"></div>');
        const $grid = $('<div class="grid-container"></div>');
        
        const { data: slots } = await _supabase
            .from('card_slots')
            .select('*')
            .eq('page_id', page.id)
            .order('slot_index', { ascending: true });

        for (let i = 0; i < 9; i++) {
            const slotData = slots ? slots.find(s => s.slot_index === i) : null;
            const $slot = $('<div class="card-slot"></div>');
            if (slotData) {
                $slot.attr({
                    'data-name': slotData.name || '',
                    'data-rarity': slotData.rarity || '',
                    'data-expansion': slotData.expansion || '',
                    'data-condition': slotData.condition || '',
                    'data-quantity': slotData.quantity || '',
                    'data-price': slotData.price || ''
                });
                if (slotData.image_url) $slot.append(`<img src="${slotData.image_url}" class="tcg-card">`);
            }
            $grid.append($slot);
        }
        $pageDiv.append($grid).appendTo($albumDiv);
    }

    if ((pages.length + 1) % 2 !== 0) {
        const backImg = album.back_image_url || 'https://via.placeholder.com/600x840?text=Contraportada';
        $albumDiv.append(`<div class="page cover-page"><img src="${backImg}"></div>`);
    }

    const $images = $albumDiv.find('img');
    let loadedCount = 0;
    let turnInitialized = false;

    const initTurn = () => {
        if (turnInitialized) return;
        turnInitialized = true;
        const isMobile = window.innerWidth <= 640;
        let width = 600, height = 420;
        if (isMobile) {
            width = ($albumContainer.width() || window.innerWidth) * 0.98;
            height = (width / 600) * 420;
        }
        $albumDiv.turn({
            width: width, height: height,
            autoCenter: false, gradients: true, acceleration: false,
            display: 'double', elevation: 50, duration: 600,
            cornerSize: isMobile ? 150 : 50,
            when: {
                start: (e, p, corner) => { if (!corner) e.preventDefault(); }
            }
        });
    };

    if ($images.length === 0) setTimeout(initTurn, 150);
    else {
        $images.on('load error', () => { if (++loadedCount >= $images.length) setTimeout(initTurn, 200); });
        setTimeout(initTurn, 1500);
    }
}
