# Solventia icon set (from the original s-logo.svg)

| File | Use |
|---|---|
| favicon.ico | 16/32/48 in one file, served at /favicon.ico |
| favicon.svg | Scalable tab icon for modern browsers |
| favicon-16.png, favicon-32.png, favicon-48.png, favicon-96.png | PNG tab icons (48/96 are what Google Search uses) |
| apple-touch-icon.png | 180 x 180, iPhone home screen |
| icon-192.png, icon-512.png | Web manifest (Android / install) |
| solventia-mark-512.png | Transparent S mark, for the Organization logo in JSON-LD and anywhere else |

All tab icons sit on a white rounded square so the navy S stays visible on dark browser tabs.

## <head> tags (every page)
```html
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-96.png" type="image/png" sizes="96x96">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
```

## site.webmanifest icons
```json
"icons": [
  { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
  { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
]
```
