const sql = require('mssql');

var DBHandler = function(dbConfig) {
    this.dbConfig = dbConfig;
};

DBHandler.prototype.connect = async function(){
    var dbName = String(this.dbConfig["database"]);
    var server = String(this.dbConfig["server"]);
    var port = parseInt(this.dbConfig["port"])

    const dbConfigCustDB = {
        user: 'almighty',
        password: 'almighty',
        server: server,
        port: port,
        database: dbName,
        connectionTimeout : 1500,
        pool: {
            max : 10,
            min : 0,
            idleTimeoutMillis: 1500
        },
        options: {
            "encrypt":false,
            "enableArithAbort":true
        }
    };

    try{
        this.pool = new sql.ConnectionPool(dbConfigCustDB);
        await this.pool.connect();
        this.request = this.pool.request();
    } catch(error){
    
        dbConfigCustDB.password = 'Almighty' + this.dbConfig.custNo + '!'
        this.pool = new sql.ConnectionPool(dbConfigCustDB);
        await this.pool.connect();
        this.request = this.pool.request();
    }
}

DBHandler.prototype.openTransaction = async function(){
    this.transaction = new sql.Transaction(this.pool);
    this.request = await new sql.Request(this.transaction);
    await this.transaction.begin();
}

DBHandler.prototype.executeQuery = async function(queryInfo){
    var args = queryInfo["args"];
    var query = String(queryInfo["query"]);
    for(idx in args){
        var arg = args[idx];
        this.request = this.request.input(arg["key"],arg["type"],arg["value"]);
    }
    var result = await this.request.query(query);
    this.request = await new sql.Request(this.transaction);
    return result;
}

DBHandler.prototype.commitTransaction = function(){
    this.transaction.commit();
}

DBHandler.prototype.rollbackTranscation = function(){
    this.transaction.rollback();
}

async function executeSingleQuery(event) {
    var result;
    if(!event.hasOwnProperty("server")){
        event.server = "db-cloud.smartdoctor.kr"
        event.port = 3341
    }
    const dbHandler = new DBHandler(event);
    try{
        await dbHandler.connect();
        result = await dbHandler.executeQuery(event);
    } catch(err){
        result = err;
        console.dir(err);
    }
    return result;
}

module.exports = {DBHandler, executeSingleQuery};