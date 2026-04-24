# 📸 Fotaza 2 - Plataforma para compartir y vender fotografías

## Descripción

Fotaza 2 es una aplicación web completa que permite almacenar, ordenar, buscar, vender y compartir fotografías en línea. Desarrollada con **Node.js**, **Express**, **MySQL** y **Pug**, siguiendo el patrón arquitectónico MVC.

## ✨ Características implementadas

### ✅ Sistema de autenticación
- Registro y login de usuarios
- Roles: usuario, validador, administrador
- Cuentas activas/inactivas

### ✅ Gestor de contenidos
- Publicaciones con múltiples imágenes
- Etiquetas (tags)
- Comentarios con opción de cierre
- Valoración de imágenes (1-5 estrellas)
- Licencias (copyright / sin copyright)
- Marca de agua en imágenes con copyright
- Botón "Me interesa" con notificación

### ✅ Sistema de denuncias y moderación
- Denuncias de publicaciones y comentarios
- Contador de denuncias (3 denuncias = revisión)
- Validador de contenidos (aprueba o desestima)
- Inactivación automática tras 3 publicaciones bajadas

### ✅ Motor de búsqueda
- Búsqueda por título, descripción y etiquetas
- Filtros por autor y etiqueta
- Paginación de resultados

### ✅ Seguimiento de usuarios
- Seguir/dejar de seguir usuarios
- Contador de seguidores y seguidos
- Feed con publicaciones de usuarios seguidos

### ✅ Notificaciones
- Comentarios, valoraciones, "me interesa", nuevos seguidores
- Marcar como leídas
- Contador en tiempo real

### ✅ Colecciones favoritos
- Crear colecciones personalizadas
- Agregar/eliminar publicaciones
- Vistas exclusivas del usuario

### ✅ Mensajería privada
- Envío de mensajes entre usuarios
- Conversaciones organizadas
- Notificaciones de nuevos mensajes

### ✅ Panel de administración
- Gestión de denuncias pendientes
- Revisión y aprobación/desestimación
- Reactivación de usuarios inactivos

## 🚀 Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/fotaza2.git
cd fotaza2

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 4. Crear base de datos
npm run db:init

# 5. Iniciar servidor
npm start
# o en modo desarrollo
npm run dev
