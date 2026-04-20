# plumber

## Local Setup

```bash
# build
docker build -t plumber .

# run
docker run -p 8080:80 plumber
```

## CI/CD

Push to `main` → GitHub Actions builds and pushes `krapi0314/plumber:<sha>` → ArgoCD deploys to k8s.

## URL

https://plumber.kevinprk.com
