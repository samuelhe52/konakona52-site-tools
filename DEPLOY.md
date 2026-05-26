# Deployment

This site deploys as static files behind the existing Nginx site on `serHK`.

## Default target

- SSH host: `serHK`
- Domain: `tools.konakona52.com`
- Site root on server: `/var/www/tools.konakona52.com/dist`

## Command

```bash
make deploy
```

The deploy script will:

1. Run `npm run lint` and `npm run build`.
2. Ensure the deployed content directory exists on the server.
3. Sync `dist/` to the server with `rsync --delete`.
4. Verify the public HTTPS endpoint.

## One-off server setup

The Nginx site and HTTPS certificate are intentionally not managed from this repo.

They were bootstrapped directly on `serHK` with:

```bash
sudo install -d -m 755 -o samuel -g www-data /var/www/tools.konakona52.com/dist
sudoedit /etc/nginx/sites-available/tools.konakona52.com.conf
sudo ln -s /etc/nginx/sites-available/tools.konakona52.com.conf /etc/nginx/sites-enabled/tools.konakona52.com.conf
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d tools.konakona52.com --redirect
```

## Overrides

These environment variables can be set when you need a different target:

```bash
SSH_HOST=serHK DOMAIN=tools.konakona52.com make deploy
```

Optional:

- `REMOTE_SITE_ROOT`
- `REMOTE_DIST_DIR`
