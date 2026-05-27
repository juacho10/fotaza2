# 📸 Fotaza 2 - Plataforma para compartir y vender fotografías

## Descripción

Fotaza 2 es una aplicación web completa que permite almacenar, ordenar, buscar, vender y compartir fotografías en línea. Desarrollada con **Node.js**, **Express**, **MySQL** y **Pug**, siguiendo el patrón arquitectónico MVC.

## 🌐 URL de producción

**La aplicación está disponible en:** https://fotaza2.vercel.app

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
- Contador de seguidores y seguidos por perfil
- Feed con publicaciones de usuarios seguidos
- No se puede seguir a sí mismo ni duplicar seguimientos

### ✅ Notificaciones
- Comentarios, valoraciones, "me interesa", nuevos seguidores
- Marcar como leídas
- Contador en tiempo real

### ✅ Colecciones favoritos
- Crear colecciones personalizadas
- Agregar/eliminar publicaciones
- Vistas exclusivas del usuario
- No se puede guardar la misma publicación dos veces

### ✅ Mensajería privada
- Envío de mensajes entre usuarios interesados
- Conversaciones organizadas por usuario
- Notificaciones de nuevos mensajes
- Eliminar mensajes individuales o conversaciones completas

### ✅ Panel de administración
- Gestión de denuncias pendientes (publicaciones y comentarios)
- Revisión y aprobación/desestimación
- Reactivación de usuarios inactivos
- Estadísticas del sistema

  ## 👥 Usuarios de prueba

| Email | Contraseña | Rol |
|-------|------------|-----|
| admin@fotaza2.com | password123 | Administrador |
| validator@fotaza2.com | password123 | Validador |
| juan@example.com | password123 | Usuario |
| maria@example.com | password123 | Usuario |
| carlos@example.com | password123 | Usuario |
| ana@example.com | password123 | Usuario |

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

# Base de datos (Railway o local)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_contraseña
DB_NAME=fotaza2_db

# Cloudinary
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# Seguridad
SESSION_SECRET=tu_secret_session
JWT_SECRET=tu_secret_jwt
NODE_ENV=development

# 4. Crear base de datos
npm run db:init

# 5. Iniciar servidor
npm start
# o en modo desarrollo
npm run dev
