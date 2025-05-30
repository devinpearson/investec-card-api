/**
 * Represents the response from the authentication endpoint.
 */
export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

/**
 * Represents a generic reference response containing a list of code-name pairs.
 */
export interface ReferenceResponse {
  data: {
    result: Array<{
      Code: string;
      Name: string;
    }>;
  };
}

/**
 * Represents a card object.
 */
export interface Card {
  CardKey: number;
  CardNumber: string;
  IsProgrammable: boolean;
  status: string;
  CardTypeCode: string;
  AccountNumber: string;
  AccountId: string;
}

/**
 * Represents the response containing a list of cards.
 */
export interface CardResponse {
  data: {
    cards: Card[];
  };
}

/**
 * Represents the response containing code details.
 */
export interface CodeResponse {
  data: {
    result: {
      codeId: string;
      code: string;
      createdAt: string;
      updatedAt: string;
      error: null;
    };
  };
}

/**
 * Represents a set of environment variables as key-value pairs.
 */
export interface EnvVars {
  [key: string]: string;
}

/**
 * Represents the response containing environment variables.
 */
export interface EnvResponse {
  data: {
    result: {
      variables: EnvVars;
      createdAt: string;
      updatedAt: string;
      error: null;
    };
  };
}

/**
 * Represents the result of a code execution, including execution items and errors.
 */
export interface ExecutionResult {
  data: { result: { executionItems: ExecutionItem[]; error: null } };
}

/**
 * Represents the result of executing code, containing execution items.
 */
export interface ExecuteResult {
  data: { result: ExecutionItem[] };
}

/**
 * Represents the response for toggling code features.
 */
export interface CodeToggle {
  data: { result: { Enabled: boolean } };
}

/**
 * Represents a single execution item in a code execution result.
 */
export interface ExecutionItem {
  executionId: string;
  rootCodeFunctionId: string;
  sandbox: boolean;
  type: string;
  authorizationApproved: boolean | null;
  logs: any[];
  smsCount: number;
  emailCount: number;
  pushNotificationCount: number;
  createdAt: string;
  startedAt: string;
  completedAt: string;
  updatedAt: string;
}

/**
 * Represents a transaction object for code execution.
 */
export interface Transaction {
  accountNumber: string;
  dateTime: string;
  centsAmount: number;
  currencyCode: string;
  type: string;
  reference: string;
  card: {
    id: string;
  };
  merchant: Merchant;
}

/**
 * Represents a merchant involved in a transaction.
 */
export interface Merchant {
  category: MerchantCategory;
  name: string;
  city: string;
  country: Country;
}

/**
 * Represents a merchant category.
 */
export interface MerchantCategory {
  key: string;
  code: string;
  name: string;
}

/**
 * Represents a country object.
 */
export interface Country {
  code: CountryCode;
  alpha3: string;
  name: string;
}

/**
 * Enum of supported country codes.
 */
export enum CountryCode {
  AF = 'AF',
  AL = 'AL',
  DZ = 'DZ',
  AS = 'AS',
  AD = 'AD',
  AO = 'AO',
  AI = 'AI',
  AQ = 'AQ',
  AG = 'AG',
  AR = 'AR',
  AM = 'AM',
  AW = 'AW',
  AU = 'AU',
  AT = 'AT',
  AZ = 'AZ',
  BS = 'BS',
  BH = 'BH',
  BD = 'BD',
  BB = 'BB',
  BY = 'BY',
  BE = 'BE',
  BZ = 'BZ',
  BJ = 'BJ',
  BM = 'BM',
  BT = 'BT',
  BO = 'BO',
  BQ = 'BQ',
  BA = 'BA',
  BW = 'BW',
  BV = 'BV',
  BR = 'BR',
  IO = 'IO',
  BN = 'BN',
  BG = 'BG',
  BF = 'BF',
  BI = 'BI',
  CV = 'CV',
  KH = 'KH',
  CM = 'CM',
  CA = 'CA',
  KY = 'KY',
  CF = 'CF',
  TD = 'TD',
  CL = 'CL',
  CN = 'CN',
  CX = 'CX',
  CC = 'CC',
  CO = 'CO',
  KM = 'KM',
  CD = 'CD',
  CG = 'CG',
  CK = 'CK',
  CR = 'CR',
  HR = 'HR',
  CU = 'CU',
  CW = 'CW',
  CY = 'CY',
  CZ = 'CZ',
  CI = 'CI',
  DK = 'DK',
  DJ = 'DJ',
  DM = 'DM',
  DO = 'DO',
  EC = 'EC',
  EG = 'EG',
  SV = 'SV',
  GQ = 'GQ',
  ER = 'ER',
  EE = 'EE',
  SZ = 'SZ',
  ET = 'ET',
  FK = 'FK',
  FO = 'FO',
  FJ = 'FJ',
  FI = 'FI',
  FR = 'FR',
  GF = 'GF',
  PF = 'PF',
  TF = 'TF',
  GA = 'GA',
  GM = 'GM',
  GE = 'GE',
  DE = 'DE',
  GH = 'GH',
  GI = 'GI',
  GR = 'GR',
  GL = 'GL',
  GD = 'GD',
  GP = 'GP',
  GU = 'GU',
  GT = 'GT',
  GG = 'GG',
  GN = 'GN',
  GW = 'GW',
  GY = 'GY',
  HT = 'HT',
  HM = 'HM',
  VA = 'VA',
  HN = 'HN',
  HK = 'HK',
  HU = 'HU',
  IS = 'IS',
  IN = 'IN',
  ID = 'ID',
  IR = 'IR',
  IQ = 'IQ',
  IE = 'IE',
  IM = 'IM',
  IL = 'IL',
  IT = 'IT',
  JM = 'JM',
  JP = 'JP',
  JE = 'JE',
  JO = 'JO',
  KZ = 'KZ',
  KE = 'KE',
  KI = 'KI',
  KP = 'KP',
  KR = 'KR',
  KW = 'KW',
  KG = 'KG',
  LA = 'LA',
  LV = 'LV',
  LB = 'LB',
  LS = 'LS',
  LR = 'LR',
  LY = 'LY',
  LI = 'LI',
  LT = 'LT',
  LU = 'LU',
  MO = 'MO',
  MG = 'MG',
  MW = 'MW',
  MY = 'MY',
  MV = 'MV',
  ML = 'ML',
  MT = 'MT',
  MH = 'MH',
  MQ = 'MQ',
  MR = 'MR',
  MU = 'MU',
  YT = 'YT',
  MX = 'MX',
  FM = 'FM',
  MD = 'MD',
  MC = 'MC',
  MN = 'MN',
  ME = 'ME',
  MS = 'MS',
  MA = 'MA',
  MZ = 'MZ',
  MM = 'MM',
  NA = 'NA',
  NR = 'NR',
  NP = 'NP',
  NL = 'NL',
  NC = 'NC',
  NZ = 'NZ',
  NI = 'NI',
  NE = 'NE',
  NG = 'NG',
  NU = 'NU',
  NF = 'NF',
  MP = 'MP',
  NO = 'NO',
  OM = 'OM',
  PK = 'PK',
  PW = 'PW',
  PS = 'PS',
  PA = 'PA',
  PG = 'PG',
  PY = 'PY',
  PE = 'PE',
  PH = 'PH',
  PN = 'PN',
  PL = 'PL',
  PT = 'PT',
  PR = 'PR',
  QA = 'QA',
  MK = 'MK',
  RO = 'RO',
  RU = 'RU',
  RW = 'RW',
  RE = 'RE',
  BL = 'BL',
  SH = 'SH',
  KN = 'KN',
  LC = 'LC',
  MF = 'MF',
  PM = 'PM',
  VC = 'VC',
  WS = 'WS',
  SM = 'SM',
  ST = 'ST',
  SA = 'SA',
  SN = 'SN',
  RS = 'RS',
  SC = 'SC',
  SL = 'SL',
  SG = 'SG',
  SX = 'SX',
  SK = 'SK',
  SI = 'SI',
  SB = 'SB',
  SO = 'SO',
  ZA = 'ZA',
  GS = 'GS',
  SS = 'SS',
  ES = 'ES',
  LK = 'LK',
  SD = 'SD',
  SR = 'SR',
  SJ = 'SJ',
  SE = 'SE',
  CH = 'CH',
  SY = 'SY',
  TW = 'TW',
  TJ = 'TJ',
  TZ = 'TZ',
  TH = 'TH',
  TL = 'TL',
  TG = 'TG',
  TK = 'TK',
  TO = 'TO',
  TT = 'TT',
  TN = 'TN',
  TR = 'TR',
  TM = 'TM',
  TC = 'TC',
  TV = 'TV',
  UG = 'UG',
  UA = 'UA',
  AE = 'AE',
  GB = 'GB',
  UM = 'UM',
  US = 'US',
  UY = 'UY',
  UZ = 'UZ',
  VU = 'VU',
  VE = 'VE',
  VN = 'VN',
  VG = 'VG',
  VI = 'VI',
  WF = 'WF',
  EH = 'EH',
  YE = 'YE',
  ZM = 'ZM',
  ZW = 'ZW',
  AX = 'AX',
  ZZ = 'ZZ',
}
