// the finding built with emscripten, used to expose
// oniguruma to JavaScript land.
#include <stdio.h>
#include <string.h>
#include "oniguruma.h"
#include <emscripten.h>

#define MIN(a,b) (((a)<(b))?(a):(b))
#define isutf(c) (((c)&0xC0)!=0x80)

/* charnum => byte offset */
int u8_offset(char *str, int charnum)
{
  int offs=0;
  while (charnum > 0 && str[offs]) {
    (void)(isutf(str[++offs]) || isutf(str[++offs]) ||
      isutf(str[++offs]) || ++offs);
      charnum--;
  }
  return offs;
}

void * EMSCRIPTEN_KEEPALIVE create_regex(OnigUChar *pattern, char* result)
{
  int r;
  regex_t* reg;
  OnigErrorInfo einfo;

  r = onig_new(&reg, pattern, pattern + onigenc_str_bytelen_null(ONIG_ENCODING_UTF8, pattern),
    ONIG_OPTION_CAPTURE_GROUP, ONIG_ENCODING_UTF8, ONIG_SYNTAX_DEFAULT, &einfo);
  if (r != ONIG_NORMAL) {
    char s[ONIG_MAX_ERROR_MESSAGE_LEN];
    onig_error_code_to_str(s, r, &einfo);
    sprintf(result, "%s", s);
    return 0;
  }

  return reg;
}

int EMSCRIPTEN_KEEPALIVE search(regex_t *reg, OnigUChar *str, char *result, int offset)
{
  int r;
  OnigUChar *start, *range, *end;
  char *resultp = result;
  OnigErrorInfo einfo;
  OnigRegion *region;

  region = onig_region_new();

  end   = str + onigenc_str_bytelen_null(ONIG_ENCODING_UTF8, str);
  start = MIN(end, str + u8_offset(str, offset));
  range = end;
  r = onig_search(reg, str, end, start, range, region, ONIG_OPTION_NONE);

  resultp += sprintf(resultp, "[\n");
  if (r >= 0) {
    int i;

    for (i = 0; i < region->num_regs; i++) {
      if (i != 0) resultp += sprintf(resultp, ",");
      resultp += sprintf(resultp, "{\"start\": %d,  \"end\": %d}\n", region->beg[i], region->end[i]);
    }
    resultp += sprintf(resultp, "]");
  }
  else if (r == ONIG_MISMATCH) {
    resultp += sprintf(resultp, "]");
    return 1;
  }
  else { /* error */
    char s[ONIG_MAX_ERROR_MESSAGE_LEN];
    onig_error_code_to_str(s, r);
    sprintf(result, "%s", s);
    return 0;
  }
  onig_region_free(region, 1);
  return 1;
}

void EMSCRIPTEN_KEEPALIVE end(regex_t* reg) {
  onig_free(reg);
  onig_end();
}
