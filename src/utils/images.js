// src/utils/images.js

export const fixImageURL = (url) => {
    // 1. Si no hay URL, ponemos el placeholder
    if (!url) return 'https://via.placeholder.com/300x300?text=Sin+Imagen';

    // 2. Si el usuario pegó el enlace COMPLETO de Drive
    if (url.includes('drive.google.com')) {
        const idMatch = url.match(/\/d\/(.+?)(\/|$|\?)/);
        if (idMatch && idMatch[1]) {
            return `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
        }
    }

    // 3. NUEVO: Si el usuario pegó SOLO EL ID (asumimos que es ID si no empieza con http)
    // Los IDs de Drive suelen ser largos (más de 20 caracteres) y no tienen espacios
    if (!url.startsWith('http') && !url.startsWith('data:') && !url.startsWith('/') && url.length > 20 && !url.includes(' ')) {
        return `https://drive.google.com/uc?export=view&id=${url}`;
    }
    
    // 4. Si es otro tipo de enlace (Imgur, etc), lo devolvemos tal cual
    return url;
};

export const formatPrice = (price) => {
    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN'
    }).format(price);
};