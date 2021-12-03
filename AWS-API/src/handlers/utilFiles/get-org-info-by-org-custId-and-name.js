const sql = require('mssql')
const dbCommon = require('../dbHandler/db-handler')

async function getOrgInfoByOrgCustIdAndName(OrgId,orgCustId, orgName){
    const dbConfArg = {
        database : 'SmartDoctor',
        query : `
        SELECT  A.CARE_ORG_ID   CareOrgId,
        A.SVR_IP        ServerIp,
        A.SVR_PORT      ServerPort,
        B.CUST_NO       CustNo,
        B.ORGA_NAME     OrgaName
        FROM SmartDoctor.dbo.NC_CONN_INFO A, SmartDoctor.dbo.ORGANIZATION_INFO B 
        WHERE A.CUST_NO = B.CUST_NO
        AND A.CUST_NO= @OrgCustId
        AND A.CARE_ORG_ID = ISNULL(@CareOrgId,A.CARE_ORG_ID)
        AND B.ORGA_NAME = ISNULL(@OrgaName,B.ORGA_NAME)`,
        args : [
        {
            key : "OrgCustId",
            type : sql.Char,
            value : orgCustId
        },
        {
            key : "CareOrgId",
            type : sql.Char,
            value : OrgId
        },
        {
            key : "OrgaName",
            type : sql.NVarChar(100),
            value : orgName
        }]
    }
    console.dir(orgCustId)
    console.dir(orgName)
    
    var dbConnList = await dbCommon.executeSingleQuery(dbConfArg);
    console.dir(dbConnList)
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

module.exports = {getOrgInfoByOrgCustIdAndName};
                  