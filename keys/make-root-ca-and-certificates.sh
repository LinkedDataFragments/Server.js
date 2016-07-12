#!/bin/bash
set -e -u
FQDN=$1

WebID="http:\/\/localhost\/webid.ttl#me"

# make directories to work from
mkdir -p certs/{server,client,ca,tmp}

# Create your very own Root Certificate Authority
openssl genrsa \
  -out certs/ca/my-root-ca.key.pem \
  2048

# Self-sign your Root Certificate Authority
# Since this is private, the details can be as bogus as you like
openssl req \
  -x509 \
  -new \
  -nodes \
  -key certs/ca/my-root-ca.key.pem \
  -days 3652 \
  -out certs/ca/my-root-ca.crt.pem \
  -subj "/C=US/ST=Utah/L=Provo/O=ACME Signing Authority Inc/CN=localhost:3000" \
  -config ./webid.cnf


# Create a Device Certificate for each domain,
# such as example.com, *.example.com, awesome.example.com
# NOTE: You MUST match CN to the domain name or ip address you want to use
openssl genrsa \
  -out certs/server/my-server.key.pem \
  2048

# Create a request from your Device, which your Root CA will sign
openssl req -new \
  -key certs/server/my-server.key.pem \
  -out certs/tmp/my-server.csr.pem \
  -subj "/C=US/ST=Utah/L=Provo/O=ACME Service/CN=${FQDN}" \
  -config ./webid.cnf

# Sign the request from Device with your Root CA
# -CAserial certs/ca/my-root-ca.srl
openssl x509 \
  -req -in certs/tmp/my-server.csr.pem \
  -CA certs/ca/my-root-ca.crt.pem \
  -CAkey certs/ca/my-root-ca.key.pem \
  -CAcreateserial \
  -out certs/server/my-server.crt.pem \
  -days 1095

# Create a public key, for funzies
#openssl rsa \
#  -in certs/server/my-server.key.pem \
#  -pubout -out certs/client/my-server.pub



#
#
# Create a Device Certificate for each trusted client
# such as example.net, *.example.net, awesome.example.net
# NOTE: You MUST match CN to the domain name or ip address you want to use
openssl genrsa \
  -out certs/client/my-app-client.key.pem \
  2048

# Create a trusted client cert
openssl req -new \
  -key certs/client/my-app-client.key.pem \
  -out certs/tmp/my-app-client.csr.pem \
  -subj "/C=US/ST=Utah/L=Provo/O=ACME App Client/CN=localhost/subjectAltName=uniformResourceIdentifier:$WebID" \
  -config ./webid.cnf

# Sign the request from Trusted Client with your Root CA
# -CAserial certs/ca/my-root-ca.srl
openssl x509 \
  -req -in certs/tmp/my-app-client.csr.pem \
  -CA certs/ca/my-root-ca.crt.pem \
  -CAkey certs/ca/my-root-ca.key.pem \
  -CAcreateserial \
  -out certs/client/my-app-client.crt.pem \
  -days 1095

# Needed for Safari, Chrome, and other Apps in OS X Keychain Access
echo ""
echo ""
echo "You must create a p12 passphrase. Consider using 'secret' for testing and demo purposes."
openssl pkcs12 -export \
  -in certs/client/my-app-client.crt.pem \
  -inkey certs/client/my-app-client.key.pem \
  -out certs/client/my-app-client.p12
echo ""
echo ""

# Create a public key, for funzies
#openssl rsa \
#  -in certs/client/my-app-client.key.pem \
#  -pubout -out certs/client/my-app-client.pub

# Put things in their proper place
rsync -a certs/ca/my-root-ca.crt.pem certs/server/
rsync -a certs/ca/my-root-ca.crt.pem certs/client/

if [ -n "which tree | grep tree" ]; then
  tree certs/
else
  find certs/
fi

# Decode public key to extract exponent and modulus
openssl x509 -in certs/client/my-app-client.crt.pem -text -noout

echo ""
echo ""
echo "Remember to open certs/client/my-root-ca.crt.pem and certs/client/my-app-client.p12"
echo "in Keychain Access on OS X / iOS if you wish to test your site with Safari, Chrome, etc"
echo ""
