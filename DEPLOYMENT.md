🧠 Project Deployment & Configuration Documentation

📘 Overview

This document explains the complete deployment and configuration process for our project hosted on Hostinger.
It covers:

-> Deployment for Frontend, Admin, and Backend

-> Server connection process

-> Database configuration

-> Environment variables setup

-> Security (SSL, Firewall, Email setup)

🚀 1. Hostinger Login & Server Access

-> Log in to the Hostinger control panel using project credentials.

-> Find the Server IP Address and Root Password — these are needed for SSH and FileZilla access.

🗂️ 2. File Upload (Frontend & Admin)

-> Open FileZilla and connect using:
Host: <server_ip>
Username: root
Password: <server_password>
Port: 22

-> After connection, navigate to:
/var/www/html

-> You will find:
frontend/
admin/
backend/

-> To update Frontend/Admin:
1.Build the new production version on local:
npm run build
2.Replace files in /var/www/html/frontend or /var/www/html/admin with your new build folder content.
3.Keep the same folder structure.

⚙️ 3. Backend Deployment Process

-> SSH into the server:
ssh root@<server_ip>
(Enter root password when prompted.)

-> Navigate to backend directory:
cd /var/www/html/backend

-> Pull the latest code from GitHub:
git pull origin main

-> Install dependencies (if needed):
npm install

-> Restart the backend server:
pm2 restart all

-> Check the running backend:
any API endpoint in browser to confirm server is live

🧩 4. Environment File (.env) Configuration

Your .env file should be placed in:
/var/www/html/backend/.env

Example .env structure:
EMAIL_HOST = smtp.hostinger.com
FROM_NAME = Pitiklini
EMAIL_PORT = 587
PORT = 3033
MONGO_URL = mongodb+srv://username:password@cluster0.mongodb.net/database_name
⚠️ Important: Never commit your .env file to GitHub. Keep it private on the server only.

🗄️ 5. MongoDB Database Details

-> Database Type:
MongoDB (Cloud-hosted using MongoDB Atlas)

-> Database Configuration Details:
Cluster Name: <your_cluster_name>
Database Name: <your_database_name>
Connection URL Format:
mongodb+srv://<username>:<password>@<cluster_name>.mongodb.net/<database_name>

-> Access Control:
Only allowed IPs can connect (configured in MongoDB Atlas → Network Access).
Ensure server IP is whitelisted before connecting.

🔒 6. Firewall, SSL, and Email Configuration

-> Firewall Settings
Allow these ports:
1.22 → SSH
2.80 → HTTP
3.443 → HTTPS
Set up in Hostinger → Security → Firewall Settings

-> SSL Setup
1.Go to Hostinger → Websites → SSL
2.Enable free SSL for your domain.

-> Email Configuration
1.Emails are managed via Hostinger’s Email panel.
2.In .env, configure SMTP as shown above (EMAIL_HOST, EMAIL_PORT, etc.).
3.Verify email delivery using a test API or contact form.

🧰 7. Common Commands

-> Navigate to backend folder
cd /var/www/html/backend

-> Pull latest updates
git pull origin main

-> Install any new dependencies
npm install

-> Restart backend (PM2)
pm2 restart all

-> View logs
pm2 logs

📄 8. Notes & Best Practices

1.Always take a backup before replacing frontend/admin build files.
2.Never push .env or sensitive credentials to GitHub.
3.Ensure Node.js and npm are updated to latest stable versions on server.


Last Updated: (12/11/2025)

curl -X POST https://www.innoverit.com/api/v2/product/get/operator \
-d "apikey=cbe4439e6d74ed7f3b01f2f94c873364&destination=5356810868500"
