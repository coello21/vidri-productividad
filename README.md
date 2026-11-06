# Productividad de preparación · CD Nejapa

SKUs por hora por preparador y por zona, y balanceo de carga, a partir del **rpt_ListaPreparacionAuditoria**.
Publicada en `https://coello21.github.io/vidri-productividad/`. Usa la misma base de Supabase que el Radar (`cd-nejapa-reportes`).

## Cómo funciona

- Lee el rpt_ListaPreparacionAuditoria (una orden por fila) y guarda todas las columnas en `prod_ordenes`; las personas agregadas al listado van en `prod_personal` (`supabase/03_productividad.sql`, ya corrido).
- SKUs/h por bloques de tiempo, jornada, % de capacidad, balanceo de carga y zonas.
- «Descargar HTML»: copia de 45 días en un solo archivo (`dist/plantilla.html`).
- En el código solo va la clave pública de Supabase; los datos los protege la seguridad (RLS) de la base. Nunca la clave `service_role`.

## Desarrollo

```bash
npm install
npm run dev      # página local
npm test         # pruebas
npm run build    # dist/ + dist/plantilla.html
```

## Publicación

- GitHub: **Settings → Pages → Source: GitHub Actions**. Cada cambio en `main` corre las pruebas y publica.
- Supabase: **Authentication → URL Configuration → Redirect URLs** debe incluir `https://coello21.github.io/vidri-productividad/**`.
