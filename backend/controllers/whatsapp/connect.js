import sdk from '@api/whapi';

sdk.auth('c81K30O2f300usdOSeBSc1CavTXwPIUW');
sdk.getChannelSettings()
  .then(({ data }) => console.log(data))
  .catch(err => console.error(err));