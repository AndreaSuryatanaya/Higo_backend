2. Tingkatkan Memory Limit
   Gunakan ini saat menjalankan script:

bash
Salin
Edit
node --max-old-space-size=4096 seed.js
Kalau masih error, coba naikkan ke 6144 atau 8192 (jika RAM kamu cukup besar):

bash
Salin
Edit
node --max-old-space-size=8192 seed.js
