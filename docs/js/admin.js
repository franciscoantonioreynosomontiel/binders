let currentAlbumId = null;
let currentSlotIndex = null;
let currentPageId = null;

$(document).ready(function() {
    loadAlbums();

    // Navigation
    $('#btn-dashboard').click(function() {
        showView('dashboard');
        loadAlbums();
    });

    $('#btn-create-album').click(async function() {
        const { data, error } = await _supabase
            .from('albums')
            .insert([{ title: 'Nuevo Álbum' }])
            .select();

        if (error) {
            alert('Error al crear álbum');
            console.error(error);
        } else {
            loadAlbums();
        }
    });

    // Album Meta Save
    $('#btn-save-album-meta').click(async function() {
        const title = $('#input-album-title').val();
        const cover = $('#input-album-cover').val();
        const back = $('#input-album-back').val();

        const { error } = await _supabase
            .from('albums')
            .update({ title, cover_image_url: cover, back_image_url: back })
            .eq('id', currentAlbumId);

        if (error) {
            alert('Error al guardar metadatos');
            console.error(error);
        } else {
            alert('Álbum actualizado');
            loadAlbums();
        }
    });

    // Page Management
    $('#btn-add-page').click(async function() {
        // Get current max index
        const { data: pages } = await _supabase
            .from('pages')
            .select('page_index')
            .eq('album_id', currentAlbumId)
            .order('page_index', { ascending: false })
            .limit(1);

        const nextIndex = (pages && pages.length > 0) ? pages[0].page_index + 1 : 0;

        const { data, error } = await _supabase
            .from('pages')
            .insert([{ album_id: currentAlbumId, page_index: nextIndex }])
            .select();

        if (error) {
            alert('Error al añadir página');
            console.error(error);
        } else {
            loadAlbumPages(currentAlbumId);
        }
    });

    // Slot Management
    $(document).on('click', '.card-slot', function() {
        currentPageId = $(this).closest('.admin-page-item').data('id');
        currentSlotIndex = $(this).data('index');
        
        // Load existing slot data if any
        loadSlotData(currentPageId, currentSlotIndex);
    });

    $('#btn-save-slot').click(async function() {
        const slotData = {
            page_id: currentPageId,
            slot_index: currentSlotIndex,
            image_url: $('#slot-image-url').val(),
            name: $('#slot-name').val(),
            rarity: $('#slot-rarity').val(),
            expansion: $('#slot-expansion').val(),
            condition: $('#slot-condition').val(),
            quantity: $('#slot-quantity').val(),
            price: $('#slot-price').val()
        };

        const { error } = await _supabase
            .from('card_slots')
            .upsert(slotData, { onConflict: 'page_id,slot_index' });

        if (error) {
            alert('Error al guardar carta');
            console.error(error);
        } else {
            $('#slot-modal').removeClass('active');
            loadAlbumPages(currentAlbumId);
        }
    });

    $('#close-slot-modal').click(function() {
        $('#slot-modal').removeClass('active');
    });
});

async function loadAlbums() {
    $('#album-list').html('<div class="loading">Cargando álbumes...</div>');

    const { data: albums, error } = await _supabase
        .from('albums')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        $('#album-list').html('<div class="error">Error al cargar álbumes.</div>');
        return;
    }

    $('#album-list').empty();
    albums.forEach(album => {
        const cover = album.cover_image_url || 'https://via.placeholder.com/300x150?text=Sin+Portada';
        const $card = $(`
            <div class="album-card">
                <img src="${cover}" alt="${album.title}">
                <h3>${album.title}</h3>
                <div style="display:flex; gap:10px; margin-top:auto;">
                    <button class="btn btn-edit-album" data-id="${album.id}">Editar</button>
                    <button class="btn btn-danger btn-delete-album" data-id="${album.id}">Eliminar</button>
                </div>
            </div>
        `);

        $card.find('.btn-edit-album').click(() => editAlbum(album));
        $card.find('.btn-delete-album').click(() => deleteAlbum(album.id));

        $('#album-list').append($card);
    });
}

function showView(view) {
    $('.admin-section').hide();
    $(`#view-${view}`).show();
}

async function editAlbum(album) {
    currentAlbumId = album.id;
    $('#editor-title').text(`Editando: ${album.title}`);
    $('#input-album-title').val(album.title);
    $('#input-album-cover').val(album.cover_image_url || '');
    $('#input-album-back').val(album.back_image_url || '');
    
    showView('editor');
    loadAlbumPages(album.id);
}

async function deleteAlbum(id) {
    if (confirm('¿Estás seguro de eliminar este álbum y todo su contenido?')) {
        const { error } = await _supabase.from('albums').delete().eq('id', id);
        if (error) alert('Error al eliminar');
        else loadAlbums();
    }
}

async function loadAlbumPages(albumId) {
    $('#page-list').html('<div class="loading">Cargando páginas...</div>');

    const { data: pages, error } = await _supabase
        .from('pages')
        .select('*')
        .eq('album_id', albumId)
        .order('page_index', { ascending: true });

    if (error) {
        $('#page-list').html('<div class="error">Error al cargar páginas.</div>');
        return;
    }

    $('#page-list').empty();
    
    for (const page of pages) {
        const $pageItem = $(`
            <div class="admin-page-item" data-id="${page.id}">
                <h3>
                    Página ${page.page_index + 1}
                    <button class="btn btn-danger btn-sm btn-delete-page" data-id="${page.id}">Eliminar Página</button>
                </h3>
                <div class="grid-container" style="height: 300px; max-width: 400px; margin: 0 auto;">
                    <!-- 9 Slots -->
                </div>
            </div>
        `);

        $pageItem.find('.btn-delete-page').click(() => deletePage(page.id));

        const $grid = $pageItem.find('.grid-container');
        
        // Fetch slots for this page
        const { data: slots } = await _supabase
            .from('card_slots')
            .select('*')
            .eq('page_id', page.id);

        for (let i = 0; i < 9; i++) {
            const slotData = slots ? slots.find(s => s.slot_index === i) : null;
            const $slot = $(`<div class="card-slot" data-index="${i}"></div>`);
            if (slotData && slotData.image_url) {
                $slot.append(`<img src="${slotData.image_url}" class="tcg-card">`);
            } else {
                $slot.append('<div style="color:#444; font-size:10px; text-align:center; padding-top:10px;">Vacío</div>');
            }
            $grid.append($slot);
        }

        $('#page-list').append($pageItem);
    }
}

async function deletePage(id) {
    if (confirm('¿Eliminar esta página?')) {
        const { error } = await _supabase.from('pages').delete().eq('id', id);
        if (error) alert('Error al eliminar');
        else loadAlbumPages(currentAlbumId);
    }
}

async function loadSlotData(pageId, slotIndex) {
    const { data, error } = await _supabase
        .from('card_slots')
        .select('*')
        .eq('page_id', pageId)
        .eq('slot_index', slotIndex)
        .single();

    // Clear form
    $('#slot-image-url').val('');
    $('#slot-name').val('');
    $('#slot-rarity').val('');
    $('#slot-expansion').val('');
    $('#slot-condition').val('');
    $('#slot-quantity').val('');
    $('#slot-price').val('');

    if (data) {
        $('#slot-image-url').val(data.image_url || '');
        $('#slot-name').val(data.name || '');
        $('#slot-rarity').val(data.rarity || '');
        $('#slot-expansion').val(data.expansion || '');
        $('#slot-condition').val(data.condition || '');
        $('#slot-quantity').val(data.quantity || '');
        $('#slot-price').val(data.price || '');
    }

    $('#slot-modal').addClass('active');
}
