#!/bin/bash
set -e

echo "Updating system and installing dependencies..."
sudo apt update
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx

echo "Installing PM2..."
sudo npm install -g pm2

echo "Deploying Backend..."
sudo rm -rf backend
sudo tar -xf backend.tar.gz
sudo chown -R ubuntu:ubuntu backend
cd backend
npm install
npm run build
pm2 delete backend || true
pm2 start dist/index.js --name "backend"
cd ..

echo "Deploying Frontend..."
sudo rm -rf frontend
sudo tar -xf frontend.tar.gz
sudo chown -R ubuntu:ubuntu frontend
cd frontend
npm install
export NEXT_PUBLIC_API_URL=http://ec2-54-241-143-180.us-west-1.compute.amazonaws.com
npm run build
pm2 delete frontend || true
pm2 start npm --name "frontend" -- run start
cd ..

echo "Saving PM2 state..."
pm2 save

echo "Configuring Nginx Reverse Proxy..."
cat << 'EOF' | sudo tee /etc/nginx/sites-available/default
server {
    listen 80;
    
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location / {
        proxy_pass http://localhost:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

sudo systemctl restart nginx
echo "Deployment Complete!"
