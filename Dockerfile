FROM node:4.2.2

# Copy the server files
ADD . /var/www/ldf-server

# Install the node module
RUN cd /var/www/ldf-server && npm install --ignore-scripts

# Expose the default port
EXPOSE 3000

# Run base binary
ENTRYPOINT ["node", "/var/www/ldf-server/bin/ldf-server"]

# Default command
CMD ["--help"]

