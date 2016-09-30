#!/bin/bash

# Generate server and ca certificates first!
# This will generate the following keys and certificates in the current directory: 
# localhost-client.key
# localhost-client.crt 
# localhost-client.p12

# Create a client key 
openssl genrsa -out localhost-client.key 2048

# Create a client certificate request
# NOTE: You MUST match CN to the domain name or ip address you want to use
openssl req -new -key localhost-client.key -out localhost-client.csr -subj "/C=BE/ST=O-VL/L=Ghent/O=MyOrganization/CN=localhost/subjectAltName=uniformResourceIdentifier:https:\/\/archive.org\/services\/purl\/purl\/linkeddatafragments\/webid.ttl#webid" -config webid.cnf

# Sign the request from client with your CA
openssl x509 -req -in localhost-client.csr -CA localhost-ca.crt -CAkey localhost-ca.key -CAcreateserial -out localhost-client.crt -days 365

# Decode public key to extract exponent and modulus
echo ""
echo "Add the following modulus to your webid:"
openssl rsa -in localhost-client.key -modulus -noout
echo "Add the following exponent to your webid:"
openssl rsa -in localhost-client.key -text -noout | awk '/Exponent/ { print $2 }'

# Generate a PK12, which you need for access in the browser
echo ""
echo "You must create a p12 passphrase. Consider using 'secret' for testing and demo purposes."
openssl pkcs12 -export -in localhost-client.crt -inkey localhost-client.key  -out localhost-client.p12

# CLEANUP
# Delete the csr (we can always regenerate it using the key)
rm localhost-client.csr
# Delete the srl 
rm localhost-ca.srl
