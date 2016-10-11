#!/bin/bash

# This will generate the following keys and certificates in the current directory: 
# localhost-ca.key & localhost-ca.crt
# localhost-server.key & localhost-server.crt

# Create a key for your own Certificate Authority
openssl genrsa -out localhost-ca.key 2048

# Self-sign your Certificate Authority
openssl req -x509 -new -nodes -key localhost-ca.key -days 365 -out localhost-ca.crt -subj "/C=BE/ST=OVL/L=Ghent/O=MyOrganization/CN=localhost" -config ./webid.cnf

# Create a server certificate 
# NOTE: You MUST match CN to the domain name or ip address you want to use
openssl genrsa -out localhost-server.key 2048

# Create a certificate request for the server, which your CA will sign
openssl req -new -key localhost-server.key -out localhost-server.csr -subj "/C=BE/ST=OVL/L=Ghent/O=MyOrganization/CN=localhost" -config ./webid.cnf

# Sign the request with your CA
openssl x509  -req -in localhost-server.csr -CA localhost-ca.crt -CAkey localhost-ca.key -CAcreateserial -out localhost-server.crt -days 365

# CLEANUP
# Delete the csr (we can always regenerate it using the key)
rm localhost-server.csr
# Delete the srl 
rm localhost-ca.srl
