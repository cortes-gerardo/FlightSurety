
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
const timestamp = Math.floor(Date.now() / 1000);
console.log("Testing")
contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    // await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSurety.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  it('(airline) cannot register an Airline using registerAirline() if it is not registered', async () => {

      // ARRANGE
      let newAirline = accounts[2];

      // ACT
      try {
          await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
      }
      catch(e) {

      }
      let result = await config.flightSuretyData.isRegisteredAirline.call(newAirline);

      // ASSERT
      assert.equal(result, false, "Airline should not be able to register another airline if it is note registered");
  });

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(config.firstAirline, {from: config.owner});
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.isRegisteredAirline.call(config.firstAirline);

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");

  });

  it('(fund) airline can not fund if is not registered', async () => {
      // ACT
      try {
          await config.flightSuretyData.fund({from: config.firstAirline, value: 10});
      } catch (e) {

      }
      let result = await config.flightSuretyData.isAirlineFunded.call(config.firstAirline);

      // ASSERT
      assert.equal(result, false, "Airline should not be funded if is not registered");
  });

    it('(fund) airline can not fund if is not the right amount', async () => {
        // ACT
        try {
            await config.flightSuretyData.fund({from: config.owner, value: 9});
        } catch (e) {

        }
        let result = await config.flightSuretyData.isAirlineFunded.call(config.owner);

        // ASSERT
        assert.equal(result, false, "Airline should not be funded if does not pay");
    });

  it('(fund) register first Airline using registerAirline()', async () => {
      // ACT
      try {
          await config.flightSuretyData.fund({from: config.owner, value: 10});
          await config.flightSuretyApp.registerAirline(config.firstAirline, {from: config.owner});
      } catch (e) {

      }
      let result = await config.flightSuretyData.isRegisteredAirline.call(config.firstAirline);

      // ASSERT
      assert.equal(result, true, "Airline should be registered");
  });

  it('(airline) more than 4 airlines can\'t be registered without consensus', async () => {
      // ARRANGE
      let secondAirline = accounts[2];
      let thirdAirline = accounts[3];
      let forthAirline = accounts[4];
      let fifthAirline = accounts[5];

      // ACT
      try {
          await config.flightSuretyApp.registerAirline(secondAirline, {from: config.owner});
          await config.flightSuretyApp.registerAirline(thirdAirline, {from: config.owner});
          await config.flightSuretyApp.registerAirline(forthAirline, {from: config.owner});
          await config.flightSuretyApp.registerAirline(fifthAirline, {from: config.owner});
      }
      catch(e) {

      }
      let result2 = await config.flightSuretyData.isRegisteredAirline.call(secondAirline);
      let result3 = await config.flightSuretyData.isRegisteredAirline.call(thirdAirline);
      let result4 = await config.flightSuretyData.isRegisteredAirline.call(forthAirline);
      let result5 = await config.flightSuretyData.isRegisteredAirline.call(fifthAirline);

      // ASSERT
      assert.equal(result2, true, "2nd Airline should be registered");
      assert.equal(result3, true, "3rd Airline should be registered");
      assert.equal(result4, true, "4th Airline should be registered");
      assert.equal(result5, false, "5th Airline should not be registered");

  });

  it('(airline) 5th airline registered with consensus', async () => {
      // ARRANGE
      let secondAirline = accounts[2];
      let fifthAirline = accounts[5];

      // ACT
      try {
          await config.flightSuretyData.fund({from: secondAirline, value: 10});
          await config.flightSuretyApp.registerAirline(fifthAirline, {from: secondAirline});
      }
      catch(e) {

      }
      let result5 = await config.flightSuretyData.isRegisteredAirline.call(fifthAirline);

      // ASSERT
      assert.equal(result5, true, "5th Airline should be registered");

  });

  it('(flights) register a flight', async () => {
      // ARRANGE
      // ACT
      try {
          await config.flightSuretyApp.registerFlight(config.firstAirline, 'GDO39', timestamp, {from: config.firstAirline});
          await config.flightSuretyApp.fetchFlightStatus(config.firstAirline, 'GDO39', timestamp, {from: config.firstAirline});
      }
      catch (e) {

      }
      // ASSERT
  });

});
