declare module '@react-native-community/datetimepicker';

// Shim for Firebase React Native auth persistence typings
declare module 'firebase/auth/react-native' {
  export const getReactNativePersistence: (storage: any) => any;
}
