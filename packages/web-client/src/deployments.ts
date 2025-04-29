export default {
  "contracts": {
    "Ratings": {
      "abi": [
        {
          "type": "function",
          "name": "MIN_STAKE",
          "inputs": [],
          "outputs": [
            {
              "name": "",
              "type": "uint64",
              "internalType": "uint64"
            }
          ],
          "stateMutability": "view"
        },
        {
          "type": "function",
          "name": "STAKE_PER_SECOND",
          "inputs": [],
          "outputs": [
            {
              "name": "",
              "type": "uint64",
              "internalType": "uint64"
            }
          ],
          "stateMutability": "view"
        },
        {
          "type": "function",
          "name": "getRating",
          "inputs": [
            {
              "name": "uriHash",
              "type": "bytes32",
              "internalType": "bytes32"
            },
            {
              "name": "rater",
              "type": "address",
              "internalType": "address"
            }
          ],
          "outputs": [
            {
              "name": "",
              "type": "tuple",
              "internalType": "struct Ratings.Rating",
              "components": [
                {
                  "name": "score",
                  "type": "uint8",
                  "internalType": "uint8"
                },
                {
                  "name": "posted",
                  "type": "uint64",
                  "internalType": "uint64"
                },
                {
                  "name": "stake",
                  "type": "uint64",
                  "internalType": "uint64"
                }
              ]
            }
          ],
          "stateMutability": "view"
        },
        {
          "type": "function",
          "name": "getRatingByString",
          "inputs": [
            {
              "name": "uri",
              "type": "string",
              "internalType": "string"
            },
            {
              "name": "rater",
              "type": "address",
              "internalType": "address"
            }
          ],
          "outputs": [
            {
              "name": "",
              "type": "tuple",
              "internalType": "struct Ratings.Rating",
              "components": [
                {
                  "name": "score",
                  "type": "uint8",
                  "internalType": "uint8"
                },
                {
                  "name": "posted",
                  "type": "uint64",
                  "internalType": "uint64"
                },
                {
                  "name": "stake",
                  "type": "uint64",
                  "internalType": "uint64"
                }
              ]
            }
          ],
          "stateMutability": "view"
        },
        {
          "type": "function",
          "name": "ratings",
          "inputs": [
            {
              "name": "",
              "type": "bytes32",
              "internalType": "bytes32"
            },
            {
              "name": "",
              "type": "address",
              "internalType": "address"
            }
          ],
          "outputs": [
            {
              "name": "score",
              "type": "uint8",
              "internalType": "uint8"
            },
            {
              "name": "posted",
              "type": "uint64",
              "internalType": "uint64"
            },
            {
              "name": "stake",
              "type": "uint64",
              "internalType": "uint64"
            }
          ],
          "stateMutability": "view"
        },
        {
          "type": "function",
          "name": "removeRating",
          "inputs": [
            {
              "name": "uri",
              "type": "string",
              "internalType": "string"
            },
            {
              "name": "rater",
              "type": "address",
              "internalType": "address"
            }
          ],
          "outputs": [],
          "stateMutability": "nonpayable"
        },
        {
          "type": "function",
          "name": "submitRating",
          "inputs": [
            {
              "name": "uri",
              "type": "string",
              "internalType": "string"
            },
            {
              "name": "score",
              "type": "uint8",
              "internalType": "uint8"
            }
          ],
          "outputs": [],
          "stateMutability": "payable"
        },
        {
          "type": "event",
          "name": "RatingRemoved",
          "inputs": [
            {
              "name": "uri",
              "type": "bytes32",
              "indexed": true,
              "internalType": "bytes32"
            },
            {
              "name": "rater",
              "type": "address",
              "indexed": true,
              "internalType": "address"
            },
            {
              "name": "cleanup",
              "type": "bool",
              "indexed": false,
              "internalType": "bool"
            }
          ],
          "anonymous": false
        },
        {
          "type": "event",
          "name": "RatingSubmitted",
          "inputs": [
            {
              "name": "uri",
              "type": "bytes32",
              "indexed": true,
              "internalType": "bytes32"
            },
            {
              "name": "rater",
              "type": "address",
              "indexed": true,
              "internalType": "address"
            },
            {
              "name": "score",
              "type": "uint8",
              "indexed": false,
              "internalType": "uint8"
            },
            {
              "name": "stake",
              "type": "uint64",
              "indexed": false,
              "internalType": "uint64"
            },
            {
              "name": "posted",
              "type": "uint64",
              "indexed": false,
              "internalType": "uint64"
            },
            {
              "name": "resubmit",
              "type": "bool",
              "indexed": false,
              "internalType": "bool"
            }
          ],
          "anonymous": false
        },
        {
          "type": "event",
          "name": "UriRevealed",
          "inputs": [
            {
              "name": "uriHash",
              "type": "bytes32",
              "indexed": true,
              "internalType": "bytes32"
            },
            {
              "name": "uri",
              "type": "string",
              "indexed": false,
              "internalType": "string"
            }
          ],
          "anonymous": false
        },
        {
          "type": "error",
          "name": "InvalidRater",
          "inputs": [
            {
              "name": "rater",
              "type": "address",
              "internalType": "address"
            }
          ]
        },
        {
          "type": "error",
          "name": "InvalidScore",
          "inputs": [
            {
              "name": "rating",
              "type": "uint8",
              "internalType": "uint8"
            }
          ]
        },
        {
          "type": "error",
          "name": "InvalidStake",
          "inputs": [
            {
              "name": "stake",
              "type": "uint64",
              "internalType": "uint64"
            }
          ]
        },
        {
          "type": "error",
          "name": "NoSuchRating",
          "inputs": [
            {
              "name": "uriHash",
              "type": "bytes32",
              "internalType": "bytes32"
            },
            {
              "name": "rater",
              "type": "address",
              "internalType": "address"
            }
          ]
        },
        {
          "type": "error",
          "name": "RatingIsStillValid",
          "inputs": [
            {
              "name": "posted",
              "type": "uint64",
              "internalType": "uint64"
            },
            {
              "name": "stake",
              "type": "uint64",
              "internalType": "uint64"
            }
          ]
        }
      ],
      "addresses": {
        "31337": "0x5fbdb2315678afecb367f032d93f642f64180aa3"
      }
    }
  }
} as const