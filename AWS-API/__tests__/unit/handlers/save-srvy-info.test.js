
const lambda = require('../../../src/handlers/smartdoctorsrvy/save-srvy-info');

describe('Test for save-srvy-info',() =>{
    it('Verifies successful response',async () => {
        const event = require('../../../events/event-save-srvy-info.json');
        const result = await lambda.saveSrvyInfo (event);

        
        var expect = [200,404];
        const assert = require('assert');
        assert(expect.includes(result["StatusCode"]));
    })
})