import {defineFeature, loadFeature} from '../../../../src/';
import {CertificateFactory} from '../../src/certificate-factory';

const feature = loadFeature(
  './examples/typescript/specs/features/using-docstrings.feature',
);

defineFeature(feature, test => {
  let certificateFactory: CertificateFactory;

  beforeEach(() => {
    certificateFactory = new CertificateFactory();
  });

  test('Print a certificate', ({given, when, then}) => {
    given(/^my machine is configured to require coins$/, () => {
      return true;
    });

    given(/^I have not inserted any coins$/, () => {
      return true;
    });

    when(/^I insert one US Quarter$/, () => {
      return true;
    });

    then(/^I should have a balance of 25 cents$/, () => {
      return true;
    });

    given(/^my machine is configured to accept US Quarters$/, () => {
      return true;
    });

    when(/^I insert a Canadian Quarter$/, () => {
      return true;
    });

    then(/^my coin should be returned$/, () => {
      return true;
    });

    when(/^I insert a US Quarter that is badly damaged$/, () => {
      return true;
    });

    then(/^my coin should be returned$/, () => {
      return true;
    });
  });
});
