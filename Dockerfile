FROM node:4.2.2

# Install location
ENV dir /var/www/ldf-server

# Copy the server files
ADD . ${dir}

# Install the node module
RUN cd ${dir} && npm install

# Expose the default port
EXPOSE 3000

# Run base binary
WORKDIR ${dir}
ENTRYPOINT ["node", "bin/ldf-server"]

# Default command
CMD ["--help"]

