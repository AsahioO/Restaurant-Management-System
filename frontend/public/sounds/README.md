# 🔔 Sonidos Personalizados

## Archivos de sonido:

### 1. `bell.mp3` - Sonido para Cocina
Se reproduce cuando llega una **nueva orden** al monitor de cocina.

### 2. `notification.mp3` - Sonido para Meseros
Se reproduce cuando una orden del mesero está **lista para servir**.

---

## Cómo agregar tus sonidos:

1. Descarga o graba sonidos en formato **MP3** o **WAV**
2. Renómbralos según corresponda:
   - `bell.mp3` → Cocina (nueva orden)
   - `notification.mp3` → Meseros (orden lista)
3. Colócalos en esta carpeta (`frontend/public/sounds/`)
4. ¡Listo! Los sonidos se reproducirán automáticamente

## Requisitos:
- **Formato:** MP3 (recomendado) o WAV
- **Duración:** 1-3 segundos ideal
- **Nombres exactos:** `bell.mp3` y `notification.mp3`

## Dónde conseguir sonidos:
- [Freesound.org](https://freesound.org/search/?q=notification) - Sonidos gratuitos
- [Pixabay](https://pixabay.com/sound-effects/search/notification/) - Sin derechos de autor
- [Zapsplat](https://www.zapsplat.com/sound-effect-category/notifications/) - Biblioteca de sonidos

## Funcionalidades por rol:

### 👨‍🍳 Cocina
- Suena `bell.mp3` cuando llega nueva orden
- Botón "Probar" para verificar sonido

### 🍽️ Meseros
- Suena `notification.mp3` cuando su orden está lista
- Vibración en dispositivos móviles
- Notificación push del navegador (si está activada)
- Toast persistente por 10 segundos
