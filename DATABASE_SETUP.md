# Todo App dengan Authentication

## Setup Database MySQL

### 1. Buat Database dan Tabel

Pertama, pastikan MySQL server sudah berjalan, lalu buat database dan tabel dengan menjalankan SQL berikut:

```sql
-- Buat database
CREATE DATABASE todo_app;

-- Gunakan database
USE todo_app;

-- Buat tabel users
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Buat tabel tasks
CREATE TABLE tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 2. Konfigurasi Environment

Edit file `.env` di folder `backend` sesuai dengan konfigurasi MySQL Anda:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=todo_app
JWT_SECRET=your_jwt_secret_key_here_make_it_very_long_and_secure_12345
```

## Setup dan Menjalankan Aplikasi

### 1. Install Dependencies Backend

```bash
cd backend
npm install
```

### 2. Jalankan Migration (Opsional)

Jika Anda ingin menggunakan script migration otomatis:

```bash
npm run migrate
```

### 3. Jalankan Backend Server

```bash
npm start
# atau untuk development
npm run dev
```

Server akan berjalan di `http://localhost:5000`

### 4. Install Dependencies Frontend

```bash
cd ..
npm install
```

### 5. Jalankan Frontend

```bash
npm start
```

Frontend akan berjalan di `http://localhost:3000`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Registrasi user baru
- `POST /api/auth/login` - Login user

### Tasks

- `GET /api/tasks` - Ambil semua task user
- `POST /api/tasks` - Buat task baru
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Hapus task

## Fitur

✅ **User Authentication** - Register dan Login dengan JWT
✅ **Personal Task Management** - Setiap user memiliki task sendiri
✅ **Real-time UI Updates** - Task diupdate secara real-time
✅ **Responsive Design** - Berfungsi di desktop dan mobile
✅ **Secure API** - Protected dengan JWT authentication
✅ **Error Handling** - Menampilkan error message yang informatif

## Teknologi yang Digunakan

### Backend

- Node.js + Express.js
- MySQL dengan mysql2
- JWT untuk authentication
- bcryptjs untuk hashing password
- express-validator untuk validasi

### Frontend

- React dengan Hooks
- CSS3 dengan animations
- localStorage untuk menyimpan token
- Fetch API untuk HTTP requests

## Struktur Database

### Tabel `users`

- `id` (Primary Key)
- `username` (Unique)
- `email` (Unique)
- `password` (Hashed)
- `created_at`
- `updated_at`

### Tabel `tasks`

- `id` (Primary Key)
- `user_id` (Foreign Key ke users)
- `title`
- `completed` (Boolean)
- `created_at`
- `updated_at`
