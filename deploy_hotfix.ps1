scp -o StrictHostKeyChecking=no -i video-profiling.pem backend/src/index.ts ubuntu@ec2-50-18-21-197.us-west-1.compute.amazonaws.com:~/backend/src/index.ts
scp -o StrictHostKeyChecking=no -i video-profiling.pem frontend/src/components/Recording.tsx ubuntu@ec2-50-18-21-197.us-west-1.compute.amazonaws.com:~/frontend/src/components/Recording.tsx
ssh -o StrictHostKeyChecking=no -i video-profiling.pem ubuntu@ec2-50-18-21-197.us-west-1.compute.amazonaws.com "mkdir -p ~/frontend/src/app/candidate/success ~/frontend/src/app/recruiter/dashboard"
scp -o StrictHostKeyChecking=no -i video-profiling.pem frontend/src/app/candidate/success/page.tsx ubuntu@ec2-50-18-21-197.us-west-1.compute.amazonaws.com:~/frontend/src/app/candidate/success/page.tsx
scp -o StrictHostKeyChecking=no -i video-profiling.pem frontend/src/app/recruiter/page.tsx ubuntu@ec2-50-18-21-197.us-west-1.compute.amazonaws.com:~/frontend/src/app/recruiter/page.tsx
scp -o StrictHostKeyChecking=no -i video-profiling.pem frontend/src/app/recruiter/dashboard/page.tsx ubuntu@ec2-50-18-21-197.us-west-1.compute.amazonaws.com:~/frontend/src/app/recruiter/dashboard/page.tsx
scp -o StrictHostKeyChecking=no -i video-profiling.pem frontend/src/app/candidate/report/ReportClient.tsx ubuntu@ec2-50-18-21-197.us-west-1.compute.amazonaws.com:~/frontend/src/app/candidate/report/ReportClient.tsx
ssh -o StrictHostKeyChecking=no -i video-profiling.pem ubuntu@ec2-50-18-21-197.us-west-1.compute.amazonaws.com "cd ~/backend && npm run build && pm2 restart backend && cd ~/frontend && npm run build && pm2 restart frontend"
