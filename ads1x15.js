
module.exports = function(RED)
{
//Licensed under the Apache License, Version 2.0
// 2018 David L Burrows
//Contact me @ https://github.com/meeki007
//or meeki007@gmail.com

    //"use strict";
    const Raspi = require('raspi');
    const I2C = require('raspi-i2c').I2C;
    const ADS1x15 = require('raspi-kit-ads1x15');

    function ads1x15MainFunction(config)
    {
        RED.nodes.createNode(this, config);
        var node = this;

        // config
        this.property = config.property||"payload";
        this.chip = config.chip || "IC_ADS1115";
        this.i2c_address = config.i2c_address || "ADDRESS_0x48";
        this.channel = config.channel || "CHANNEL_0";
        this.samplesPerSecond = config.samplesPerSecond || "SPS_250";
        this.progGainAmp = config.progGainAmp || "PGA_4_096V";

        //Function to Clear user notices, used for timmer
        var status_clear = function()
        {
          //clear status icon
          node.status({});
        };

        //clear status icon on deploy
        node.status({});

        this.on("input", function(msg)
        {

            //clear status icon every new trigger input
            node.status({});

            // Init Raspi
            Raspi.init(() =>
            {

                // Init Raspi-I2c
                const i2c = new I2C();

                // Init the ADC
                const adc = new ADS1x15(
                {
                    i2c,                                    // i2c interface
                    chip: ADS1x15.chips.IC_ADS1115,         // chip model
                    address: ADS1x15.address[this.i2c_address],  // i2c address on the bus

                    // Defaults for future readings
                    pga: ADS1x15.pga[this.progGainAmp],            // power-gain-amplifier range
                    sps: ADS1x15.spsADS1115[this.samplesPerSecond]         // data rate (samples per second)
                });

                if ( this.channel.includes('CHANNEL') )
                {
                    // Get a single-ended reading from channel-X and display the results
                    adc.readChannel(ADS1x15.channel[this.channel], (err, value, volts) =>
                    {
                        if (err)
                        {
                            return node.error('Failed to fetch value from ADC', err);
                        }
                        else
                        {
                            //send to volts to payload
                            RED.util.setMessageProperty(msg,node.property,volts);
                            //send the payload
                            node.send(msg);
                            //send status msg
                            node.status(
                            {
                              fill: 'blue',
                              shape: 'dot',
                              text: volts + 'v'
                            });
                            // clear/end status msg after 3 seconds
                            var timmerClear = setTimeout(status_clear, 5000);
                        }
                    });
                }

                else if ( this.channel.includes('DIFF') )
                {
                    // Get a differential reading from channel-X and display the results
                    adc.readDifferential(ADS1x15.differential[this.channel], (err, value, volts) =>
                    {
                        if (err)
                        {
                            return node.error('Failed to fetch value from ADC', err);
                        }
                        else
                        {
                            //send to volts to payload
                            RED.util.setMessageProperty(msg,node.property,volts);
                            //send the payload
                            node.send(msg);
                            //send status msg
                            node.status(
                            {
                              fill: 'blue',
                              shape: 'dot',
                              text: volts + 'v'
                            });
                            // clear/end status msg after 3 seconds
                            var timmerClear = setTimeout(status_clear, 5000);
                        }
                    });
                }

            });

        });

    }

    RED.nodes.registerType("ads1x15-raspi", ads1x15MainFunction);
};
