{

  "host": "127.0.0.1",
  "port": 7777,

  "keyLength": 32,

  "maxLength": 400000,

  "staticMaxAge": 15552000,

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
        "totalRequests": 500,
        "every": 60000
      }
    }
  },

  "rateLimitsPost": {
    "categories": {
      "normal": {
        "totalRequests": 1,
        "every": 300000
      }
    },
    "fail": {
      "message": "{\"message\":\"You can only upload a dump once every 5 minutes\"}",
      "type": "application/json"
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
