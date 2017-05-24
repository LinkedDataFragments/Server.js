#!/bin/bash
cd /opt
curl -O http://fallabs.com/kyotocabinet/pkg/kyotocabinet-1.2.76.tar.gz
tar -xvzf kyotocabinet-1.2.76.tar.gz && mv kyotocabinet-1.2.76 kyotocabinet && rm kyotocabinet-1.2.76.tar.gz

apt-get update
apt-get -y install liblzo2-dev liblzma-dev zlib1g-dev build-essential
cd /opt/kyotocabinet && ./configure –enable-zlib –enable-lzo –enable-lzma && make && make install
