{

  "host": "0.0.0.0",
  "port": 7777,

  "keyLength": 32,

  "maxLength": 400000,

  "staticMaxAge": 60 * 60 * 24 * 365, // 1 Year

  "recompressStaticAssets": true,

  "logging": [
    {
      "level": "verbose",
      "type": "Console",
      "colorize": true
    }
  ],

  "keyGenerator": {
    "type": "random"
  },

  "rateLimits": {
    "categories": {
      "normal": {
        "totalRequests": 1,
        "every": 60 * 60 // 1 Hour
      }
    }
  },

  "storage": {
    "type": "file",
    "path": "./data"
  },

  "documents": {
    "about": "./about.md"
  }

}
