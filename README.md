# 🔥 Portal de las Alitas — React + Vite + Supabase

## Pasos para correr localmente en VS Code

### 1. Clonar / abrir el proyecto en VS Code
Abre la carpeta del proyecto en VS Code.

### 2. Instalar dependencias
Abre la terminal integrada (`Ctrl+ñ` o `View > Terminal`) y ejecuta:
```bash
npm install
```

### 3. Configurar Supabase — Ejecuta el schema SQL
1. Ve a [supabase.com](https://supabase.com) → tu proyecto
2. Haz clic en **SQL Editor** (ícono de base de datos)
3. Crea un **New Query**
4. Copia y pega **todo** el contenido del archivo `supabase_schema.sql`
5. Haz clic en **Run** (▶)

### 4. Crear el usuario admin en Supabase
1. En Supabase → **Authentication** → **Users** → **Add user**
2. Email: `admin@portalalitas.com`
3. Password: `portalalitas123`
4. Marca "Auto Confirm User"
5. Luego en **SQL Editor** ejecuta esto para asignar rol admin:
```sql
UPDATE public.profiles
SET rol = 'admin'
WHERE email = 'admin@portalalitas.com';
```

### 5. Variables de entorno
El archivo `.env` ya está incluido con tus credenciales.
⚠️ **NO subas el `.env` a GitHub** (ya está en `.gitignore`).

Para Vercel, agrega estas variables en el dashboard de Vercel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ADMIN_EMAIL`
- `VITE_ADMIN_PASSWORD`

### 6. Correr el proyecto
```bash
npm run dev
```
Abre http://localhost:5173

## Deploy en Vercel
```bash
# Instala Vercel CLI (opcional)
npm i -g vercel
vercel
```
O sube el proyecto a GitHub y conecta el repo en vercel.com.

## Estructura del proyecto
```
src/
├── components/
│   ├── Navbar.jsx       # Barra de navegación
│   ├── AuthModal.jsx    # Modal de login/registro
│   ├── Toast.jsx        # Notificaciones
│   ├── StatusCard.jsx   # Tarjeta de pedido
│   └── ConfirmDialog.jsx
├── pages/
│   ├── Home.jsx         # Página principal
│   ├── Order.jsx        # Hacer pedido
│   ├── Status.jsx       # Mis pedidos
│   └── Admin.jsx        # Panel admin
├── lib/
│   └── supabase.js      # Cliente Supabase
├── store/
│   └── useStore.js      # Estado global (Zustand)
└── index.css            # Estilos globales
```

## Login Admin
- Email: `admin@portalalitas.com`
- Password: `portalalitas123`
- Clave especial: `clave123may`
