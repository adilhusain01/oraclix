# 🚀 Oracle MCP Deployment Guide

Complete deployment guide for Oracle MCP Server on AWS (backend) and Vercel (frontend).

## Architecture Overview

```mermaid
[Vercel Frontend] <-> [AWS Backend] <-> [Blockchain APIs]
     (Next.js)         (Express)         (CoinGecko, etc.)
```

## 📋 Prerequisites

- AWS Account with sufficient permissions
- Vercel Account
- Node.js 18+ installed locally
- Docker installed (for containerization)
- API Keys (optional but recommended):
  - CoinGecko API Key
  - QuickNode API Key

## 🔧 AWS Backend Deployment

### Option 1: EC2 with Docker (Recommended)

#### 1. Launch EC2 Instance

```bash
# Launch a new EC2 instance
# Recommended: t3.micro (1 vCPU, 1 GB RAM) for testing
# For production: t3.small or t3.medium

# Connect to your instance
ssh -i your-key.pem ec2-user@your-instance-ip
```

#### 2. Install Docker

```bash
# Install Docker on Amazon Linux 2
sudo yum update -y
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 3. Deploy Application

```bash
# Create application directory
mkdir -p /home/ec2-user/oracle-mcp
cd /home/ec2-user/oracle-mcp

# Copy your application files (use scp or git)
scp -i your-key.pem -r ./aws-server ec2-user@your-instance-ip:/home/ec2-user/oracle-mcp/

# Or clone from git
# git clone your-repository-url .
```

#### 4. Configure Environment

```bash
# Copy and configure environment file
cp aws-server/.env.example aws-server/.env
nano aws-server/.env

# Set your values:
# PORT=5000
# NODE_ENV=production
# COINGECKO_API_KEY=your_key_here
# CORS_ORIGIN=https://your-vercel-app.vercel.app
```

#### 5. Build and Run

```bash
cd aws-server

# Build and start with Docker Compose
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f
```

#### 6. Configure Security Group

In AWS Console:
- Add inbound rule: Type: HTTP, Port: 5000, Source: 0.0.0.0/0
- Add inbound rule: Type: HTTPS, Port: 443, Source: 0.0.0.0/0

#### 7. Set up Nginx (Optional - for HTTPS)

```bash
# Install Nginx
sudo yum install -y nginx

# Configure Nginx
sudo nano /etc/nginx/conf.d/oracle-mcp.conf
```

Nginx Configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Option 2: Elastic Beanstalk

#### 1. Prepare Application

```bash
# Create deployment package
cd aws-server
zip -r oracle-mcp.zip . -x "node_modules/*" ".git/*" "*.log"
```

#### 2. Deploy to Elastic Beanstalk

1. Go to AWS Elastic Beanstalk Console
2. Create New Application
3. Choose Platform: Node.js
4. Upload `oracle-mcp.zip`
5. Configure environment variables in Configuration > Software:
   - `COINGECKO_API_KEY`
   - `CORS_ORIGIN`
   - `NODE_ENV=production`

### Option 3: ECS with Fargate

#### 1. Push to ECR

```bash
# Create ECR repository
aws ecr create-repository --repository-name oracle-mcp

# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build and tag image
cd aws-server
docker build -t oracle-mcp .
docker tag oracle-mcp:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/oracle-mcp:latest

# Push image
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/oracle-mcp:latest
```

#### 2. Create ECS Service

1. Create ECS Cluster
2. Create Task Definition with your ECR image
3. Create Service with desired count: 1
4. Configure Load Balancer (ALB)

## 🌐 Vercel Frontend Deployment

### Option 1: Git Integration (Recommended)

#### 1. Push to Git Repository

```bash
cd vercel-frontend
git init
git add .
git commit -m "Initial frontend commit"
git push origin main
```

#### 2. Connect to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your Git repository
4. Configure settings:
   - Framework: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`

#### 3. Configure Environment Variables

In Vercel Dashboard > Project > Settings > Environment Variables:

```
NEXT_PUBLIC_API_URL = https://your-aws-backend-url.com
```

#### 4. Deploy

Vercel will automatically deploy on every git push to main branch.

### Option 2: Vercel CLI

#### 1. Install Vercel CLI

```bash
npm i -g vercel
```

#### 2. Deploy

```bash
cd vercel-frontend

# Login to Vercel
vercel login

# Deploy
vercel --prod

# Set environment variable
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://your-aws-backend-url.com
```

## 🔗 Connecting Frontend and Backend

### 1. Update Backend CORS

After deploying frontend, update backend environment:

```bash
# In your AWS server .env file
CORS_ORIGIN=https://your-vercel-app.vercel.app
FRONTEND_URL=https://your-vercel-app.vercel.app
```

Restart your backend service:
```bash
docker-compose restart
```

### 2. Update Frontend API URL

In Vercel dashboard:
- Go to Project > Settings > Environment Variables
- Update `NEXT_PUBLIC_API_URL` to your AWS backend URL
- Redeploy if needed

## 📊 Monitoring and Maintenance

### Backend Monitoring

#### CloudWatch (for ECS/Beanstalk)
```bash
# View logs
aws logs describe-log-groups
aws logs get-log-events --log-group-name your-log-group
```

#### Manual EC2 Monitoring
```bash
# Check application status
docker-compose ps
docker-compose logs oracle-mcp-server

# Monitor resources
htop
df -h
free -m
```

### Frontend Monitoring

Vercel provides built-in analytics:
- Go to Project > Functions > Analytics
- Monitor performance and errors

### Health Checks

Both services include health endpoints:
- Backend: `https://your-backend.com/api/health`
- Frontend: Built-in Vercel health checks

## 🔒 Security Best Practices

### Backend Security

1. **Environment Variables**: Never commit API keys to git
2. **HTTPS**: Always use HTTPS in production
3. **Rate Limiting**: Already configured in the Express app
4. **CORS**: Properly configured for your frontend domain
5. **Security Headers**: Helmet.js already included

### Frontend Security

1. **Environment Variables**: Use `NEXT_PUBLIC_` prefix only for client-safe values
2. **CSP Headers**: Configure in `next.config.js` if needed
3. **Input Validation**: All user inputs are validated

## 🧪 Testing Deployment

### 1. Test Backend Independently

```bash
# Health check
curl https://your-backend-url.com/api/health

# Test token price endpoint
curl -X POST https://your-backend-url.com/api/token-price \
  -H "Content-Type: application/json" \
  -d '{"symbol": "ETH", "network": "polygon"}'
```

### 2. Test Frontend

1. Open your Vercel URL
2. Check if dashboard loads
3. Test API connections in the "API Test Panel"
4. Verify real-time data updates

### 3. End-to-End Testing

1. Open frontend dashboard
2. Check all components load correctly
3. Verify token prices update
4. Test gas price displays
5. Check historical charts
6. Run API test panel

## 🚨 Troubleshooting

### Common Backend Issues

#### Port Issues
```bash
# Check if port is in use
sudo netstat -tlnp | grep :5000

# Kill process if needed
sudo kill -9 PID
```

#### Docker Issues
```bash
# Check Docker status
docker-compose ps
docker-compose logs

# Restart services
docker-compose restart
docker-compose down && docker-compose up -d
```

#### API Key Issues
```bash
# Test CoinGecko API
curl "https://api.coingecko.com/api/v3/ping"

# Check environment variables
echo $COINGECKO_API_KEY
```

### Common Frontend Issues

#### Build Failures
- Check environment variables are set
- Verify API URL is accessible
- Check for TypeScript errors

#### API Connection Issues
- Verify CORS configuration
- Check backend health endpoint
- Ensure API URL is correct

### Debug Commands

```bash
# Backend debugging
docker-compose logs -f oracle-mcp-server
curl -I https://your-backend.com/api/health

# Frontend debugging (local)
npm run dev
npm run build
npm run lint
```

## 🎯 Performance Optimization

### Backend Optimization

1. **Caching**: Already implemented with 30-second TTL
2. **Database**: Consider Redis for production caching
3. **Load Balancing**: Use ALB for multiple instances
4. **Auto Scaling**: Configure ECS auto scaling

### Frontend Optimization

1. **Next.js Optimization**: Already configured
2. **Image Optimization**: Use Next.js Image component
3. **Code Splitting**: Automatic with Next.js
4. **Caching**: Vercel edge caching enabled

## 💰 Cost Estimation

### AWS Costs (Monthly)
- EC2 t3.micro: ~$8-15
- Elastic Beanstalk: ~$15-25
- ECS Fargate: ~$10-20
- Data Transfer: ~$1-5

### Vercel Costs
- Hobby Plan: Free (suitable for personal projects)
- Pro Plan: $20/month (for production apps)

## 📚 Additional Resources

- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [AWS EC2 User Guide](https://docs.aws.amazon.com/ec2/)
- [Vercel Documentation](https://vercel.com/docs)
- [Docker Documentation](https://docs.docker.com/)

## 🆘 Support

For issues with deployment:
1. Check the troubleshooting section above
2. Verify all environment variables are set correctly
3. Check service health endpoints
4. Review application logs

The deployment is complete! Your Oracle MCP Server should now be running on AWS with the frontend dashboard on Vercel.
