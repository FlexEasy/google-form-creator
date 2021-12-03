const sql = require('mssql');
const util = require('../util');
const dbCommon = require('../dbHandler/db-handler')

exports.getShortUrl = async(event) =>{
    const inUrl = event["CareOrgId"];
    const CustPhoneNo = event["CustPhone"];

    const dbConnectionInfo = await util.getOrgInfoByOrgIdAndName(OrgId,orgName);
    if(!dbConnectionInfo["Success"]) return dbConnectionInfo["result"];
}