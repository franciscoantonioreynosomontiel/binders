let isDragging = false;
let isMoving = false;
let isManualPageTurn = false;
let startX, startY;

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

    // --- Card Interaction Logic ---
    // Seguimiento global para gestos de arrastre
    $(document).on("touchstart mousedown", function(e) {
        const ev = e.type.startsWith('touch') ? e.originalEvent.touches[0] : e;
        startX = ev.pageX;
        startY = ev.pageY;
        isDragging = false;
    });

    $(document).on("touchmove mousemove", function(e) {
        if (startX === undefined || startY === undefined) return;
        const ev = e.type.startsWith('touch') ? e.originalEvent.touches[0] : e;
        const dx = Math.abs(ev.pageX - startX);
        const dy = Math.abs(ev.pageY - startY);

        if (dx > 10 || dy > 10) {
            isMoving = true;
        }
        if (dx > 15 || dy > 15) {
            isDragging = true;
        }
    });

    $(document).on("touchend mouseup", function() {
        setTimeout(() => {
            startX = undefined;
            startY = undefined;
        }, 50);
        // Reset flags con un poco de delay para que el click lo detecte
        setTimeout(() => {
            isDragging = false;
            isMoving = false;
        }, 200);
    });

    $(document).on("click", "#close-btn, #image-overlay", function(e) {
        if (e.target === this || $(this).attr('id') === 'close-btn') {
            $("#image-overlay").removeClass("active");
        }
    });

    // Search Logic
    $('#search-input').on('input', function() {
        const query = $(this).val().toLowerCase().trim();
        if (query.length > 0) {
            $('#clear-search').show();
            filterContent(query);
        } else {
            $('#clear-search').hide();
            resetFilter();
        }
    });

    $('#clear-search').click(function() {
        $('#search-input').val('');
        $(this).hide();
        resetFilter();
    });
});

function filterContent(query) {
    const currentView = $('.nav-btn.active').data('view');

    if (currentView === 'albums') {
        $('.public-album-item').each(function() {
            const $album = $(this);
            const albumTitle = $album.find('.public-album-header').text().toLowerCase();
            let albumMatch = albumTitle.includes(query);
            let cardMatch = false;
            let firstMatchPage = -1;

            $album.find('.card-slot').each(function() {
                const cardName = ($(this).data('name') || '').toLowerCase();
                if (cardName.includes(query)) {
                    cardMatch = true;
                    if (firstMatchPage === -1) {
                        const $page = $(this).closest('.page');
                        firstMatchPage = $page.index() + 1;
                    }
                }
            });

            if (albumMatch || cardMatch) {
                $album.show();
                if (cardMatch && firstMatchPage !== -1) {
                    const $turnAlbum = $album.find('.album');
                    if ($turnAlbum.turn('is')) {
                        isManualPageTurn = true;
                        $turnAlbum.turn('page', firstMatchPage);
                        setTimeout(() => { isManualPageTurn = false; }, 100);
                    }
                }
            } else {
                $album.hide();
            }
        });
    } else {
        $('.deck-public-item').each(function() {
            const $deck = $(this);
            const deckName = $deck.find('h3').text().toLowerCase();
            let deckMatch = deckName.includes(query);
            let cardMatch = false;

            $deck.find('.swiper-slide').each(function() {
                const cardName = ($(this).find('img').attr('alt') || '').toLowerCase();
                if (cardName.includes(query)) {
                    cardMatch = true;
                }
            });

            if (deckMatch || cardMatch) {
                $deck.show();
            } else {
                $deck.hide();
            }
        });
    }
}

function resetFilter() {
    $('.public-album-item, .deck-public-item').show();
}

function openCardModal($slot) {
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
}

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
                                <div class="swiper-slide card-slot"
                                     data-name="${card.name || ''}"
                                     data-rarity="${card.rarity || ''}"
                                     data-expansion="${card.expansion || ''}"
                                     data-condition="${card.condition || ''}"
                                     data-quantity="${card.quantity || '1'}"
                                     data-price="${card.price || ''}">
                                    <img src="${card.image_url}" alt="${card.name || 'Card'}" />
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
            preventClicksPropagation: false,
            on: {
                click: function(s, e) {
                    // Si no estamos arrastrando, abrimos el modal
                    if (!isDragging) {
                        const $slot = $(e.target).closest('.card-slot');
                        if ($slot.length) openCardModal($slot);
                    }
                }
            }
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

        // Seguimiento de inicio de toque/click para distinguir arrastre de click
        $grid.on("touchstart mousedown", ".card-slot", function(e) {
            const ev = e.type.startsWith('touch') ? e.originalEvent.touches[0] : e;
            startX = ev.pageX;
            startY = ev.pageY;
            isDragging = false;
            isMoving = false;
            // No usamos stopPropagation aquí para permitir que Turn.js detecte gestos en las esquinas
        });

        $grid.on("click", ".card-slot", function(e) {
            if (isDragging) return;
            e.stopPropagation(); // Detener para que el click solo abra el modal
            openCardModal($(this));
        });

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

        const $wrapper = $albumContainer.find('.album-wrapper');

        if (isMobile) {
            width = ($albumContainer.width() || window.innerWidth) * 0.96;
            height = (width / 600) * 420;
            $wrapper.css({width: width, height: height});
        }

        $albumDiv.turn({
            width: width, height: height,
            autoCenter: false, gradients: true, acceleration: false,
            display: 'double', elevation: 0, duration: 500,
            cornerSize: 40,
            when: {
                start: function(e, p, corner) {
                    // Permitir el flip solo desde las esquinas
                    if (!corner) e.preventDefault();

                    // Forzar posición estable desde el inicio
                    $(this).css({
                        'left': '0',
                        'top': '0',
                        'margin': '0 auto',
                        'transform': 'translate(0, 0)'
                    });
                },
                turning: function(e, page, view) {
                    $(this).css({
                        'left': '0',
                        'top': '0',
                        'margin': '0 auto',
                        'transform': 'translate(0, 0)'
                    });
                }
            }
        });

    };

    if ($images.length === 0) setTimeout(initTurn, 150);
    else {
        $images.on('load error', () => { if (++loadedCount >= $images.length) setTimeout(initTurn, 200); });
        setTimeout(initTurn, 1500);
    }
}
