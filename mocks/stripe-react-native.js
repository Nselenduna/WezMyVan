// Web stub — @stripe/stripe-react-native is native only
const React = require('react');

const StripeProvider = ({ children }) => children;
const useStripe = () => ({
  initPaymentSheet: async () => ({ error: null }),
  presentPaymentSheet: async () => ({ error: null }),
  createPaymentMethod: async () => ({ error: null, paymentMethod: null }),
  confirmPayment: async () => ({ error: null, paymentIntent: null }),
});

module.exports = { StripeProvider, useStripe };
