interface Star {
  left: string;
  size: number;
  delay: string;
  duration: string;
  gold?: boolean;
}

const STARS: Star[] = [
  { left: '4%', size: 2, delay: '0s', duration: '11s' },
  { left: '10%', size: 3, delay: '2.5s', duration: '13s' },
  { left: '16%', size: 2, delay: '6s', duration: '10s' },
  { left: '23%', size: 4, delay: '1s', duration: '14s', gold: true },
  { left: '30%', size: 2, delay: '4s', duration: '12s' },
  { left: '37%', size: 3, delay: '8s', duration: '11s' },
  { left: '45%', size: 2, delay: '3s', duration: '15s' },
  { left: '52%', size: 4, delay: '6.5s', duration: '13s', gold: true },
  { left: '59%', size: 2, delay: '0.5s', duration: '10s' },
  { left: '66%', size: 3, delay: '5s', duration: '12s' },
  { left: '73%', size: 2, delay: '9s', duration: '14s' },
  { left: '80%', size: 3, delay: '2s', duration: '11s', gold: true },
  { left: '87%', size: 2, delay: '7s', duration: '13s' },
  { left: '93%', size: 3, delay: '4.5s', duration: '10s' },
  { left: '97%', size: 2, delay: '1.5s', duration: '15s' },
];

export default function StarField() {
  return (
    <div className="star-field" aria-hidden="true">
      {STARS.map((star, i) => (
        <span
          key={i}
          className={star.gold ? 'gold' : undefined}
          style={{
            left: star.left,
            width: star.size,
            height: star.size,
            animationDelay: star.delay,
            animationDuration: star.duration,
          }}
        />
      ))}
    </div>
  );
}
