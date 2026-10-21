// value noise ที่ใช้ร่วมกันระหว่าง shader หญ้า พื้น ฟ้า และเงาเมฆ
export const NOISE_GLSL = /* glsl */ `
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
      mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }
  // fbm สำหรับเมฆ: หมุนแต่ละชั้นเล็กน้อยกันลายเรียงเป็นตาราง
  float fbm(vec2 p, int octaves) {
    float v = 0.0;
    float a = 0.5;
    mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
    for (int i = 0; i < 5; i++) {
      if (i >= octaves) break;
      v += a * vnoise(p);
      p = r * p * 2.03 + 11.7;
      a *= 0.5;
    }
    return v;
  }
`;
