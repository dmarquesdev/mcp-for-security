#!/bin/sh
set -e

# Port 22: SSH-like banner
socat TCP-LISTEN:22,fork,reuseaddr SYSTEM:'echo "SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.6"' &

# Port 80: HTTP response
socat TCP-LISTEN:80,fork,reuseaddr SYSTEM:'echo -e "HTTP/1.1 200 OK\r\nServer: scan-target\r\nContent-Type: text/plain\r\n\r\nscan-target port 80"' &

# Port 443: HTTPS-like banner (plain TCP with TLS-like response for port detection)
socat TCP-LISTEN:443,fork,reuseaddr SYSTEM:'echo -e "HTTP/1.1 400 Bad Request\r\nServer: scan-target-tls\r\n\r\nPlain HTTP not accepted"' &

# Port 3306: MySQL-like banner
socat TCP-LISTEN:3306,fork,reuseaddr SYSTEM:'printf "J\0\0\0\n5.7.42-scan-target"' &

# Port 8080: HTTP alt response
socat TCP-LISTEN:8080,fork,reuseaddr SYSTEM:'echo -e "HTTP/1.1 200 OK\r\nServer: scan-target-alt\r\nContent-Type: text/plain\r\n\r\nscan-target port 8080"' &

echo "scan-target: all listeners started on ports 22, 80, 443, 3306, 8080"

# Keep container alive
wait
