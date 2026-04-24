// Valoración de imágenes
document.querySelectorAll('.rate-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const imageId = btn.dataset.imageId;
        const modal = new bootstrap.Modal(document.getElementById('rateModal'));
        window.currentImageId = imageId;
        modal.show();
    });
});

// Envío de valoración
document.getElementById('submitRating')?.addEventListener('click', async () => {
    const rating = document.querySelector('input[name="rating"]:checked')?.value;
    if (!rating) {
        alert('Selecciona una valoración');
        return;
    }
    
    try {
        const response = await fetch(`/posts/images/${window.currentImageId}/rate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: rating })
        });
        
        if (response.ok) {
            location.reload();
        } else {
            const data = await response.json();
            alert(data.error || 'Error al valorar');
        }
    } catch (error) {
        alert('Error de conexión');
    }
});

// Me interesa
document.querySelectorAll('.interest-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        const imageId = btn.dataset.imageId;
        try {
            const response = await fetch(`/posts/images/${imageId}/interest`, { method: 'POST' });
            if (response.ok) {
                alert('Se ha notificado al autor de tu interés');
                btn.disabled = true;
                btn.innerHTML = '<i class="bi bi-heart-fill"></i> Interés enviado';
            } else {
                const data = await response.json();
                alert(data.error || 'Error al marcar interés');
            }
        } catch (error) {
            alert('Error de conexión');
        }
    });
});

// Seguir/Dejar de seguir
document.querySelectorAll('.follow-btn, .unfollow-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        const userId = btn.dataset.userId;
        const isFollowing = btn.classList.contains('unfollow-btn');
        const url = isFollowing ? `/users/${userId}/unfollow` : `/users/${userId}/follow`;
        
        try {
            const response = await fetch(url, { method: 'POST' });
            if (response.ok) {
                location.reload();
            } else {
                const data = await response.json();
                alert(data.error || 'Error al procesar la solicitud');
            }
        } catch (error) {
            alert('Error de conexión');
        }
    });
});

// Confirmación de eliminación
document.querySelectorAll('.delete-confirm').forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (!confirm('¿Estás seguro de eliminar esto? Esta acción no se puede deshacer.')) {
            e.preventDefault();
        }
    });
});

// Marcar notificación como leída
document.querySelectorAll('.mark-read').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        try {
            const response = await fetch(`/users/notifications/${id}/read`, { method: 'POST' });
            if (response.ok) {
                const item = btn.closest('.notification-item');
                item.classList.remove('unread');
                btn.remove();
                
                const badge = document.getElementById('unread-badge');
                if (badge) {
                    const count = parseInt(badge.textContent) - 1;
                    if (count > 0) {
                        badge.textContent = count;
                    } else {
                        badge.style.display = 'none';
                    }
                }
            }
        } catch (error) {
            console.error('Error:', error);
        }
    });
});

// Preview de imágenes al seleccionar
document.getElementById('images')?.addEventListener('change', function(e) {
    const preview = document.getElementById('imagePreview');
    if (preview) {
        preview.innerHTML = '';
        const files = Array.from(this.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.width = '80px';
                img.style.height = '80px';
                img.style.objectFit = 'cover';
                img.style.margin = '5px';
                img.style.borderRadius = '4px';
                preview.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    }
});

// Auto-resize de textareas
document.querySelectorAll('textarea').forEach(textarea => {
    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
});

// Marcar todas las notificaciones como leídas
document.getElementById('mark-all-read')?.addEventListener('click', async () => {
    try {
        const response = await fetch('/users/notifications/mark-all', { method: 'POST' });
        if (response.ok) {
            location.reload();
        }
    } catch (error) {
        console.error('Error:', error);
    }
});