FROM node:8-slim

# Install location
ENV dir /var/www/ldf-server

# Copy the server files
ADD . ${dir}

# Install the node module
RUN apt-get update && \
    apt-get install -y g++ make python && \
    cd ${dir} && npm install && \
    apt-get remove -y g++ make python && apt-get autoremove -y && \
    rm -rf /var/cache/apt/archives

# Expose the default port
EXPOSE 3000

# Run base binary
WORKDIR ${dir}
ENTRYPOINT ["node", "bin/ldf-server"]

# Default command
CMD ["--help"]

