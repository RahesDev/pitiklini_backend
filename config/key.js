let key = {};
// if (process.env.NODE_ENV === 'production') {

// } else {
    const API_URL = process.env.API_URL;
    key = {
        host          : process.env.HOST,
        //host: 'localhost',
        secretOrKey   : "FxUum76z",
        // mongoURI      : "mongodb://localhost:27017/sampledb",
        // mongoURI      : "mongodb+srv://sivasakthi:sivasakthi12345@exaurix-rhf3y.mongodb.net/test",
        // mongoURI      : "mongodb+srv://sampleCrypto:Sample@123cryptoWorld@sample.vygbk.mongodb.net/sample",
        mongoURI      : process.env.DB_URL,
        port          : process.env.PORT,
        siteUrl       : process.env.SITE_URL,
        // baseUrl       : 'cryptoclearing.house',
        baseUrl       : process.env.BASE_URL,
        //siteUrl: 'http://localhost:5000/',

        API: {
        },
        WHITELISTURL: [
            'http://localhost:62393',
            'http://localhost:4200',
            'http://localhost:4200/',
            'http://localhost:3033',
            'http://localhost:5000',
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:3002',
            'https://pitiklini.blfdemo.online/',
            'https://pitiklini.blfdemo.online',
            'https://pitiklini.com/',
            'https://pitiklini.com',
            undefined

        ],
        JWT_TOKEN_SECRET        : process.env.JWT_TOKEN_SECRET,
        address_validator       : "testnet", // prod - mainnet, testnet - testnet,
        sendgrid_api            : "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",
        from_mail               : process.env.FROM_EMAIL,
        ENCRYPTION_KEY          : process.env.ENCRYPTION_KEY,
        IV_LENGTH               : 16,
        // redisdata               : {port: '', host: '',db: 0, password: ''},
        redisdata               : {},
        // baseUrl_admin           : 'https://admin.justbit.pro/'
        baseUrl_admin           : 'http://localhost:4200/'
    };
// }
module.exports = key;