const sql = require('mssql')
const dbCommon = require('../dbHandler/db-handler')

async function getOrgInfoByOrgIdAndName(orgId, orgName){
    const dbConfArg = {
        database : 'SmartDoctor',
        query : `
        SELECT
            A.CARE_ORG_ID   CareOrgId,
            A.SVR_IP        ServerIp,
            A.SVR_PORT      ServerPort,
            B.CUST_NO       CustNo,
            B.ORGA_NAME     OrgaName
        FROM SmartDoctor.dbo.NC_CONN_INFO A, SmartDoctor.dbo.ORGANIZATION_INFO B 
        WHERE A.CARE_ORG_ID = B.CARE_ORG_ID
        AND A.CARE_ORG_ID = @CareOrgId
        AND B.ORGA_NAME = ISNULL(@OrgaName,B.ORGA_NAME)`,
        args : [
        {
            key : "CareOrgId",
            type : sql.Char,
            value : orgId
        },
        {
            key : "OrgaName",
            type : sql.NVarChar(100),
            value : orgName
        }]
    }
    
    var dbConnList = await dbCommon.executeSingleQuery(dbConfArg);
    if(dbConnList?.["rowsAffected"]?.[0] > 0){
        if(dbConnList["rowsAffected"] != 1){
            return {
                Success : false,
                result : {
                    StatusCode : 404,
                    rejection: "Multiple Organization",
                    rejectionCode : 101
                }
            };
        }
        else return {
            Success : true,
            result : dbConnList["recordset"][0]
        }
    }
    else return {
        Success : false,
        result : {
            StatusCode : 404,
            rejection : "Organization Not Found",
            rejectionCode : 102
        }
    }

}

module.exports = {getOrgInfoByOrgIdAndName};