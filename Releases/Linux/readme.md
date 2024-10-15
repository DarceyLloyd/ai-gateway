### INFO

There is some issue with Electron Builder at the moment:
```
cannot get, wait  error=Get "https://service.electron.build/find-build-agent?no-cache=1g5hgvr": dial tcp 51.15.76.176:443: connectex: No connection could be made because the target machine actively refused it.
```

However you can run the application from bash/terminal/console/cli:

```
cd src
npm run buildDist
```

