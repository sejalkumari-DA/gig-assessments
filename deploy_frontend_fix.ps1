$files = @(
  "frontend/src/app/candidate/report/ReportClient.tsx",
  "frontend/src/app/recruiter/dashboard/page.tsx",
  "frontend/src/app/recruiter/page.tsx",
  "frontend/src/components/Recording.tsx",
  "frontend/src/components/SessionReportClient.tsx"
)

foreach ($file in $files) {
    Write-Host "Uploading $file"
    scp -o StrictHostKeyChecking=no -i video-profiling.pem $file "ubuntu@ec2-50-18-21-197.us-west-1.compute.amazonaws.com:~/$file"
}

Write-Host "Rebuilding frontend on EC2..."
ssh -o StrictHostKeyChecking=no -i video-profiling.pem ubuntu@ec2-50-18-21-197.us-west-1.compute.amazonaws.com "bash -c 'cd ~/frontend && npm run build && pm2 restart frontend'"
Write-Host "Done!"
