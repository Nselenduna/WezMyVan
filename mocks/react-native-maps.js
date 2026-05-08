// Web stub — react-native-maps is native only
const React = require('react');
const { View } = require('react-native');

const MapView = (props) => React.createElement(View, props);
MapView.Animated = MapView;

const Marker = (props) => React.createElement(View, props);
const Polyline = (props) => React.createElement(View, props);
const Circle = (props) => React.createElement(View, props);
const Callout = (props) => React.createElement(View, props);

module.exports = MapView;
module.exports.default = MapView;
module.exports.Marker = Marker;
module.exports.Polyline = Polyline;
module.exports.Circle = Circle;
module.exports.Callout = Callout;
module.exports.PROVIDER_GOOGLE = 'google';
module.exports.PROVIDER_DEFAULT = null;
