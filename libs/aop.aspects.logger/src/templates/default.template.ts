export const ON_EXCEPTION_TEMPLATE =
  '{datetime} - [RequestId: {requestid}] - [{targettype}.cs, {methodinfo}]. Took {took} ms. Exception: {error}.';

export const ON_EXCEPTION_TEMPLATE_TRACKING =
  '{datetime} - [RequestId: {requestid}] - [{targettype}.cs, {methodinfo}], [Tracking ID:{trackingid}]. Took {took} ms. Exception: {error}.';

export const ON_ENTRY_TEMPLATE =
  '{datetime} - [RequestId: {requestid}] - [{targettype}.cs, {methodinfo}]] Start Call. Took {took} ms. Args: {params}.';

export const ON_ENTRY_TEMPLATE_TRACKING =
  '{datetime} - [RequestId: {requestid}] - [{targettype}.cs, {methodinfo}], [Tracking ID:{trackingid}] Start Call. Took {took} ms. Args: {params}.';

export const ON_CALL_TEMPLATE =
  '{datetime} - [RequestId: {requestid}] - [{targettype}.cs, {methodinfo}]]. Took {took} ms. Result: {returnedvalue}.';

export const ON_CALL_TEMPLATE_TRACKING =
  '{datetime} - [RequestId: {requestid}] -  [{targettype}.cs, {methodinfo}], [Tracking ID:{trackingid}]. Took {took} ms. Result: {returnedvalue}.';

export const ON_EXIT_TEMPLATE =
  '{datetime} - [{targettype}.cs, {methodinfo}]] End Call. Took {took} ms.';

export const ON_EXIT_TEMPLATE_TRACKING =
  '{datetime} - [{targettype}.cs, {methodinfo}], [Tracking ID:{trackingid}] End Call. Took {took} ms.';
