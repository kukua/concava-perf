# ConCaVa Performance

> Automatically generated weekly reports on data loss.

## Usage

```bash
git clone https://github.com/kukua/concava-perf
cd concava-perf

cp config.js.example config.js
chmod 600 config.js
# > Edit config.js

docker-compose run report npm install
sudo chown -R $USER:$USER . # Gimme

docker-compose up
```
