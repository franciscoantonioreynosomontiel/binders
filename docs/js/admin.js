let currentAlbumId = null;
let currentSlotIndex = null;
let currentPageId = null;
let currentUser = null;

$(document).ready(function() {
    checkSession();

    // Authentication Actions
    $('#btn-login').click(handleLogin);
    $('#btn-logout').click(handleLogout);

    // Navigation
    $('#btn-dashboard').click(function() {
        showView('dashboard');
        loadAlbums();
    });

    $('#btn-create-album').click(async function() {
        if (!currentUser) return;

        const { data, error } = await _supabase
            .from('albums')
            .insert([{ title: 'Nuevo Álbum', user_id: currentUser.id }])
            .select();

        if (error) {
            Swal.fire('Error', 'No se pudo crear el álbum', 'error');
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
            Swal.fire('Error', 'No se pudieron guardar los cambios', 'error');
            console.error(error);
        } else {
            Swal.fire({
                title: '¡Actualizado!',
                text: 'El álbum se ha actualizado correctamente',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
            loadAlbums();
            showView('dashboard');
        }
    });

    // Page Management
    $('#btn-add-page').click(async function() {
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
            Swal.fire('Error', 'No se pudo añadir la página', 'error');
            console.error(error);
        } else {
            loadAlbumPages(currentAlbumId);
        }
    });

    // Slot Management
    $(document).on('click', '.card-slot', function() {
        currentPageId = $(this).closest('.admin-page-item').data('id');
        currentSlotIndex = $(this).data('index');
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
            Swal.fire('Error', 'No se pudo guardar la información de la carta', 'error');
            console.error(error);
        } else {
            Swal.fire({
                title: 'Guardado',
                text: 'Carta actualizada',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
            $('#slot-modal').removeClass('active');
            loadAlbumPages(currentAlbumId);
        }
    });

    $('#close-slot-modal').click(function() {
        $('#slot-modal').removeClass('active');
    });
});

// Auth Functions
function checkSession() {
    const session = localStorage.getItem('tcg_session');
    if (session) {
        currentUser = JSON.parse(session);
        showAuthenticatedContent();
    } else {
        showLoginView();
    }
}

async function handleLogin() {
    const username = $('#login-username').val();
    const password = $('#login-password').val();

    if (!username || !password) {
        Swal.fire('Atención', 'Por favor, completa todos los campos', 'warning');
        return;
    }

    const { data, error } = await _supabase
        .from('usuarios')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

    if (error || !data) {
        Swal.fire('Error', 'Usuario o contraseña incorrectos', 'error');
    } else {
        currentUser = data;
        localStorage.setItem('tcg_session', JSON.stringify(data));
        showAuthenticatedContent();
    }
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('tcg_session');
    location.reload();
}

function showLoginView() {
    $('body').removeClass('public-body');
    $('#login-modal').addClass('active');
    $('#authenticated-content').hide();
}

function showAuthenticatedContent() {
    $('body').addClass('public-body');
    $('#login-modal').removeClass('active');
    $('#authenticated-content').show();
    $('#welcome-message').text(`Álbumes de ${currentUser.username}`);

    // Show user panel only if admin
    if (currentUser.role === 'admin') {
        $('#btn-users-panel').show();
    } else {
        $('#btn-users-panel').hide();
    }

    // Generate public store link
    const publicUrl = `${window.location.origin}${window.location.pathname.replace('admin.html', 'public.html')}?store=${encodeURIComponent(currentUser.store_name)}`;

    const linkHtml = `
        <div class="share-card">
            <div class="share-info">
                <i class="fas fa-link"></i>
                <span>Enlace de tu tienda:</span>
                <input type="text" id="public-link-input" value="${publicUrl}" readonly>
            </div>
            <button onclick="copyPublicLink()" class="btn btn-copy">
                <i class="fas fa-copy"></i> Copiar
            </button>
            <a href="${publicUrl}" target="_blank" class="btn btn-visit">
                <i class="fas fa-external-link-alt"></i> Visitar
            </a>
        </div>
    `;
    $('#store-link-container').html(linkHtml);

    showView('dashboard');
    loadAlbums();
}

function copyPublicLink() {
    const copyText = document.getElementById("public-link-input");
    copyText.select();
    copyText.setSelectionRange(0, 99999); // For mobile devices
    navigator.clipboard.writeText(copyText.value);

    const btn = document.querySelector('.btn-copy');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> ¡Copiado!';
    btn.classList.add('btn-success');

    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.classList.remove('btn-success');
    }, 2000);
}

// Data Functions
async function loadAlbums() {
    $('#album-list').html('<div class="loading">Cargando álbumes...</div>');

    const { data: albums, error } = await _supabase
        .from('albums')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('id', { ascending: true });

    if (error) {
        $('#album-list').html('<div class="error">Error al cargar álbumes.</div>');
        return;
    }

    $('#album-list').empty();
    if (albums.length === 0) {
        $('#album-list').html('<div class="empty">No tienes álbumes. Crea uno para empezar.</div>');
        return;
    }

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
    const result = await Swal.fire({
        title: '¿Estás seguro?',
        text: "Se eliminará el álbum y todo su contenido permanentemente",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ff4757',
        cancelButtonColor: '#333',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        const { error } = await _supabase.from('albums').delete().eq('id', id);
        if (error) {
            Swal.fire('Error', 'No se pudo eliminar el álbum', 'error');
        } else {
            Swal.fire('Eliminado', 'El álbum ha sido borrado', 'success');
            loadAlbums();
        }
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
                <div class="grid-container admin-grid-preview">
                    <!-- 9 Slots -->
                </div>
            </div>
        `);

        $pageItem.find('.btn-delete-page').click(() => deletePage(page.id));

        const $grid = $pageItem.find('.grid-container');
        
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
    const result = await Swal.fire({
        title: '¿Eliminar página?',
        text: "Esta acción no se puede deshacer",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ff4757',
        cancelButtonColor: '#333',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        const { error } = await _supabase.from('pages').delete().eq('id', id);
        if (error) {
            Swal.fire('Error', 'No se pudo eliminar la página', 'error');
        } else {
            Swal.fire('Eliminada', 'La página ha sido borrada', 'success');
            loadAlbumPages(currentAlbumId);
        }
    }
}

async function loadSlotData(pageId, slotIndex) {
    const { data, error } = await _supabase
        .from('card_slots')
        .select('*')
        .eq('page_id', pageId)
        .eq('slot_index', slotIndex)
        .single();

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
