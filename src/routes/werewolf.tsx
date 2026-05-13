import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PageFrame } from "@/components/game/PageFrame";
import { HoldToReveal } from "@/components/game/HoldToReveal";
import { NarratorButton } from "@/components/game/NarratorButton";
import { usePlayers, awardWin, shuffle } from "@/lib/game/store";
import { vibrate, crack, seerSound, win as winAudio, victory, failed, howlSound, roosterSound } from "@/lib/game/audio";

export const Route = createFileRoute("/werewolf")({
  head: () => ({
    meta: [
      { title: "Werewolf — The Board Game Suite" },
      { name: "description", content: "Klasik Werewolf: Seer, Doctor, Villager melawan Werewolf." },
    ],
  }),
  component: WerewolfPage,
});

type WRole = "werewolf" | "seer" | "doctor" | "cupid" | "hunter" | "joker" | "villager";
type WP = { name: string; role: WRole; alive: boolean };
type Phase = "setup" | "role-config" | "role-assignment" | "werewolf-selection" | "reveal" | "night-cupid" | "night-werewolf" | "night-seer" | "night-doctor" | "night-hunter" | "morning" | "vote" | "end";

interface RoleConfig {
  werewolf: number;
  seer: number;
  doctor: number;
  cupid: number;
  hunter: number;
  joker: number;
  villager: number;
}

interface RoleInfo {
  id: WRole;
  name: string;
  icon: string;
  description: string;
  detail: string;
  maxCount?: number;
  minPlayers?: number;
  faction: "good" | "evil" | "special";
}

const ROLES: RoleInfo[] = [
  { 
    id: "werewolf", 
    name: "Werewolf", 
    icon: "🐺", 
    description: "Makan warga setiap malam", 
    maxCount: 3,
    detail: "Setiap malam, werewolf bangun dan memilih satu warga untuk dimakan. Werewolf menang jika jumlah werewolf sama atau lebih banyak dari warga yang hidup.",
    faction: "evil"
  },
  { 
    id: "seer", 
    name: "Peramal", 
    icon: "🔮", 
    description: "Lihat identitas satu pemain tiap malam", 
    maxCount: 1, 
    minPlayers: 4,
    detail: "Setiap malam, peramal dapat memilih satu pemain untuk melihat identitas aslinya (werewolf atau bukan). Peramal adalah role penting untuk tim warga.",
    faction: "good"
  },
  { 
    id: "doctor", 
    name: "Dokter", 
    icon: "🥼", 
    description: "Selamatkan satu pemain tiap malam", 
    maxCount: 1, 
    minPlayers: 5,
    detail: "Setiap malam, Dokter dapat memilih satu pemain untuk diselamatkan dari serangan werewolf. Dokter bisa menyelamatkan diri sendiri, tapi tidak dua malam berturut-turut.",
    faction: "good"
  },
  { 
    id: "cupid", 
    name: "Cupid", 
    icon: "💘", 
    description: "Satukan dua pemain jadi pasangan", 
    maxCount: 1, 
    minPlayers: 6,
    detail: "Di malam pertama, cupid memilih dua pemain untuk menjadi pasangan cinta. Jika salah satu pasangan mati, yang lain akan mati juga karena patah hati.",
    faction: "good"
  },
  { 
    id: "hunter", 
    name: "Pemburu", 
    icon: "🏹", 
    description: "Bawa 1 pemain bersama saat mati", 
    maxCount: 1, 
    minPlayers: 6,
    detail: "Ketika pemburu dibunuh, dia bisa memilih 1 pemain untuk dibawa mati bersama. Pemburu adalah role penting untuk tim warga.",
    faction: "good"
  },
  { 
    id: "joker", 
    name: "Joker", 
    icon: "🃏", 
    description: "Menang jika di vote warga", 
    maxCount: 1, 
    minPlayers: 6,
    detail: "Joker adalah faksi khusus yang bukan warga maupun werewolf. Jika Joker di vote oleh warga, Joker langsung menang. Tapi jika Joker dimakan werewolf, Joker kalah.",
    faction: "special"
  },
  { 
    id: "villager", 
    name: "Warga", 
    icon: "🌿", 
    description: "Warga desa biasa", 
    detail: "Warga tidak memiliki kemampuan khusus. Mereka berpartisipasi dalam voting dan membantu tim warga menemukan werewolf.",
    faction: "good"
  },
];

function getDefaultConfig(playerCount: number): RoleConfig {
  let config: RoleConfig = {
    werewolf: 0,
    seer: 0,
    doctor: 0,
    cupid: 0,
    hunter: 0,
    joker: 0,
    villager: 0,
  };
  
  // Ensure minimum 4 villagers first
  const remainingForSpecial = playerCount - 4;
  
  if (remainingForSpecial < 1) {
    // Not enough players for special roles
    config.villager = playerCount;
    return config;
  }
  
  // Configure special roles based on player count (now starting from 5)
  if (playerCount >= 5) {
    config.werewolf = 1; // Always start with 1 werewolf
    // Other roles start at 0
  }
  
  if (playerCount >= 6) {
    // Other roles still 0, werewolf can be increased manually
  }
  
  if (playerCount >= 7) {
    // Other roles still 0, werewolf can be increased manually
  }
  
  // Adjust for small player counts to ensure minimum 4 villagers
  const totalSpecialRoles = config.werewolf + config.seer + config.doctor + config.cupid + config.hunter;
  const maxSpecialRoles = playerCount - 4; // Maximum special roles allowed
  
  if (totalSpecialRoles > maxSpecialRoles) {
    // Reduce roles to fit minimum villagers requirement
    const excess = totalSpecialRoles - maxSpecialRoles;
    
    // Prioritize keeping werewolf, then reduce other roles (hunter is lowest priority)
    if (excess > 0 && config.hunter > 0) {
      config.hunter = Math.max(0, config.hunter - 1);
    }
    if (excess > 1 && config.cupid > 0) {
      config.cupid = Math.max(0, config.cupid - 1);
    }
    if (excess > 2 && config.doctor > 0) {
      config.doctor = Math.max(0, config.doctor - 1);
    }
    if (excess > 3 && config.seer > 0) {
      config.seer = Math.max(0, config.seer - 1);
    }
  }
  
  // Calculate villagers (always at least 4)
  const finalSpecialRoles = config.werewolf + config.seer + config.doctor + config.cupid + config.hunter + config.joker;
  config.villager = Math.max(4, playerCount - finalSpecialRoles);
  
  return config;
}

/**
 * ✅ FUNGSI BARU: Hitung total good faction (good roles + villagers)
 */
function getGoodFactionCount(config: RoleConfig): number {
  return config.seer + config.doctor + config.cupid + config.hunter + config.villager;
}

/**
 * ✅ FUNGSI BARU: Check apakah menambah role ini akan melanggar minimum good faction (4) dan villagers (1)
 */
function canAddRole(config: RoleConfig, roleId: WRole, playerCount: number): boolean {
  const roleInfo = ROLES.find(r => r.id === roleId);
  if (!roleInfo) return false;
  
  // Hitung current state
  const totalSpecialRoles = config.werewolf + config.seer + config.doctor + config.cupid + config.hunter + config.joker;
  const currentVillagers = playerCount - totalSpecialRoles;
  const totalGoodRoles = config.seer + config.doctor + config.cupid + config.hunter;
  const currentGoodFaction = totalGoodRoles + currentVillagers;
  
  // Simulasi: tambahkan 1 role ini
  let newTotalSpecialRoles = totalSpecialRoles;
  let newTotalGoodRoles = totalGoodRoles;
  
  if (roleInfo.faction === "good") {
    newTotalSpecialRoles += 1;
    newTotalGoodRoles += 1;
  } else if (roleInfo.faction === "evil" || roleInfo.faction === "special") {
    newTotalSpecialRoles += 1;
  }
  
  const newVillagers = playerCount - newTotalSpecialRoles;
  const newGoodFaction = newTotalGoodRoles + newVillagers;
  
  // ✅ Constraints: Good faction minimal 4, Villagers minimal 1
  return newGoodFaction >= 4 && newVillagers >= 1;
}

function validateConfig(config: RoleConfig, playerCount: number): string | null {
  const totalSpecialRoles = config.werewolf + config.seer + config.doctor + config.cupid + config.hunter + config.joker;
  const calculatedVillagers = playerCount - totalSpecialRoles;
  
  if (totalSpecialRoles > playerCount) {
    return `Total role spesial (${totalSpecialRoles}) melebihi jumlah pemain (${playerCount})`;
  }
  
  // ✅ FIX #7: Gunakan calculated villagers
  if (calculatedVillagers < 1) {
    return `Minimal harus ada 1 warga (saat ini: ${calculatedVillagers})`;
  }
  
  for (const role of ROLES) {
    if (role.maxCount && config[role.id] > role.maxCount) {
      return `${role.name} maksimal ${role.maxCount} orang`;
    }
    if (role.minPlayers && config[role.id] > 0 && playerCount < role.minPlayers) {
      return `${role.name} butuh minimal ${role.minPlayers} pemain`;
    }
  }
  
  if (config.werewolf === 0) {
    return "Harus ada minimal 1 werewolf";
  }
  
  const goodFactionRoles = config.seer + config.doctor + config.cupid + config.hunter;
  const totalGoodFaction = goodFactionRoles + calculatedVillagers;
  
  if (totalGoodFaction < 4) {
    return `Faksi kebaikan minimal 4 pemain (saat ini: ${totalGoodFaction})`;
  }

  if (config.villager < 1) {
    return `Minimal harus ada 1 warga (saat ini: ${config.villager})`;
  }
  
  return null;
}

function buildRolesFromConfig(config: RoleConfig, playerCount: number): WRole[] {
  const roles: WRole[] = [];
  
  // Add configured roles (exclude villager - calculated automatically)
  Object.entries(config).forEach(([role, count]) => {
    if (role !== "villager") {
      for (let i = 0; i < count; i++) {
        roles.push(role as WRole);
      }
    }
  });
  
  // Fill remaining with villagers
  while (roles.length < playerCount) {
    roles.push("villager");
  }
  
  return shuffle(roles);
}

function buildRoles(n: number): WRole[] {
  const config = getDefaultConfig(n);
  return buildRolesFromConfig(config, n);
}

function WerewolfPage() {
  const [players] = usePlayers();
  const [phase, setPhase] = useState<Phase>(() => players.length >= 5 ? "role-config" : "setup");
  const [list, setList] = useState<WP[]>([]);
  const [idx, setIdx] = useState(0);
  const [werewolfTarget, setWerewolfTarget] = useState<string>("");
  const [doctorTarget, setDoctorTarget] = useState<string>("");
  const [seerTarget, setSeerTarget] = useState<string>("");
  const [killed, setKilled] = useState<string>("");
  const [winner, setWinner] = useState<string>("");
  const [roleConfig, setRoleConfig] = useState<RoleConfig>(() => getDefaultConfig(players.length));
  const [flippedRole, setFlippedRole] = useState<WRole | null>(null);
  const [seerReveal, setSeerReveal] = useState<{ target: string; role: string } | null>(null);
  const [cupidSelection, setCupidSelection] = useState<string[]>([]);
  const [couples, setCouples] = useState<[string, string] | null>(null);
  const [cupidReveal, setCupidReveal] = useState<{ player1: string; player2: string } | null>(null);
  const [hunterTarget, setHunterTarget] = useState<string>("");
  const [hunterTriggered, setHunterTriggered] = useState<boolean>(false);
  const [hunterDeathByVote, setHunterDeathByVote] = useState<boolean>(false);
  const [hunterReveal, setHunterReveal] = useState<{ target: string; role: string } | null>(null);
  const [voteReveal, setVoteReveal] = useState<{ target: string; role: string } | null>(null);
  const [cupidDeathReveal, setCupidDeathReveal] = useState<{ player: string; partner: string } | null>(null);
  const [nightStartReveal, setNightStartReveal] = useState<boolean>(false);
  const [morningStartReveal, setMorningStartReveal] = useState<boolean>(false);
  const [hunterDeathReveal, setHunterDeathReveal] = useState<{ hunter: string; target: string; targetRole: string } | null>(null);
  const [victoryAnimation, setVictoryAnimation] = useState<boolean>(false);
  const [nightCount, setNightCount] = useState<number>(1);
  const [finalRoleConfig, setFinalRoleConfig] = useState<RoleConfig>(roleConfig);

  // ✅ FIX #4: Tracking last doctor save target
  const [lastDoctorTarget, setLastDoctorTarget] = useState<string>("");

  // Sync finalRoleConfig when roleConfig changes
  useEffect(() => {
    setFinalRoleConfig(roleConfig);
  }, [roleConfig]);

  // Auto-redirect to role-config if players are sufficient
  useEffect(() => {
    if (players.length >= 5 && phase === "setup") {
      setPhase("role-config");
    }
  }, [players.length, phase]);

  // Update roleConfig when players change to ensure at least 1 werewolf
  useEffect(() => {
    if (players.length >= 5) {
      setRoleConfig(getDefaultConfig(players.length));
    }
  }, [players.length]);

  const start = () => {
    if (players.length < 5) return;
    const validation = validateConfig(roleConfig, players.length);
    if (validation) {
      alert(validation);
      return;
    }
    // ✅ SIMPAN roleConfig sebelum pindah ke role-assignment
    setFinalRoleConfig(roleConfig);
    setPhase("role-assignment");
    vibrate(50);
  };

  const nextReveal = () => {
    if (idx < list.length - 1) {
      setIdx(idx + 1);
    } else { 
      // ✅ Selalu tampilkan panel "Malam Hari Telah Tiba" untuk semua role
      setNightStartReveal(true);
      vibrate(50);
    }
  };

  const getNextPhase = (currentPhase: Phase): Phase => {
    // ✅ GUNAKAN finalRoleConfig bukan roleConfig
    const hasSeer = list.length > 0 
      ? list.some(p => p.role === "seer" && p.alive)
      : finalRoleConfig.seer > 0;
    const hasDoctor = list.length > 0 
      ? list.some(p => p.role === "doctor" && p.alive)
      : finalRoleConfig.doctor > 0;
    
    console.log('getNextPhase:', { currentPhase, hasSeer, hasDoctor, listLength: list.length, finalRoleConfig });
    
    switch (currentPhase) {
      case "night-cupid":
        return "night-werewolf";
      case "night-werewolf":
        return hasSeer ? "night-seer" : hasDoctor ? "night-doctor" : "morning";
      case "night-seer":
        return hasDoctor ? "night-doctor" : "morning";
      case "night-doctor":
        return "morning";
      default:
        return "morning";
    }
  };

  const aliveOf = (r?: WRole) => {
    console.log('Current list state:', list);
    console.log('Filtering for role:', r);
    const filtered = list.filter(p => p.alive && (!r || p.role === r));
    console.log('Filtered result:', filtered);
    return filtered;
  };

  // ✅ FIX #2: Joker hanya menang jika di-vote, bukan bagian tim warga
const checkWin = (next: WP[]): string | null => {
  const w = next.filter(p => p.alive && p.role === "werewolf").length;
  const v = next.filter(p => p.alive && p.role !== "werewolf" && p.role !== "joker").length;
  if (w === 0) return "Warga Menang!";
  if (w >= v) return "Werewolf Menang!";
  return null;
};

  // ✅ FUNGSI BARU: finishNightWithTarget - Gunakan target yang sudah diketahui
  const finishNightWithTarget = (werewolfKillTarget: string, doctoSaveTarget: string) => {
    setList(prevList => {
      let next = [...prevList];
      const hasDoctor = prevList.some(p => p.role === "doctor" && p.alive);
      
      console.log('finishNightWithTarget debug:', { 
        werewolfKillTarget, 
        doctoSaveTarget, 
        hasDoctor, 
        couples,
        listBefore: next.map(p => ({ name: p.name, alive: p.alive }))
      });
      
      // ✅ Logika yang benar: pemain mati jika werewolf mengincar DAN dokter TIDAK menyelamatkan
      const dead = werewolfKillTarget && (!hasDoctor || werewolfKillTarget !== doctoSaveTarget);
      
      console.log('Dead calculation:', { dead, werewolfKillTarget, hasDoctor, doctoSaveTarget });
      
      let killedPlayers: string[] = [];
      let cupidPartner: string | null = null;
      
      if (dead) {
        // Kill the primary target
        next = next.map(p => p.name === werewolfKillTarget ? { ...p, alive: false } : p);
        killedPlayers.push(werewolfKillTarget);
        
        // 💘 Cupid logic: if killed player is in a couple, kill their partner too
        if (couples && (couples[0] === werewolfKillTarget || couples[1] === werewolfKillTarget)) {
          const partner = couples[0] === werewolfKillTarget ? couples[1] : couples[0];
          const partnerPlayer = next.find(p => p.name === partner);
          
          if (partnerPlayer && partnerPlayer.alive) {
            next = next.map(p => p.name === partner ? { ...p, alive: false } : p);
            killedPlayers.push(partner);
            cupidPartner = partner;
            console.log('Cupid partner died:', partner);
          }
        }
      }
      
      setKilled(killedPlayers.length > 0 ? killedPlayers.join(" & ") : "");
      
      console.log('After kill:', { 
        killed: killedPlayers.join(" & "), 
        listAfter: next.map(p => ({ name: p.name, alive: p.alive }))
      });
      
      const win = checkWin(next);
      if (win) {
        const winners = next.filter(p => win.startsWith("Warga") ? p.role !== "werewolf" : p.role === "werewolf").map(p => p.name);
        awardWin(winners);
        setWinner(win);
        setVictoryAnimation(true); // Tampilkan animasi kemenangan dulu
      } else {
        // Cek apakah ada hunter yang mati
        const hunterKilled = killedPlayers.some(name => {
          const player = next.find(p => p.name === name && p.role === "hunter");
          return player !== undefined;
        });
        
        if (hunterKilled) {
          setHunterTriggered(true);
          setHunterDeathByVote(false); // Pemburu tewas karena werewolf
        }
        
        if (cupidPartner) {
          setCupidDeathReveal({ player: werewolfKillTarget, partner: cupidPartner });
        } else {
          setMorningStartReveal(true); // Selalu tampilkan panel pagi dulu
        }
      }
      
      return next;
    });
  };

  const finishNight = () => {
    // Gunakan finishNightWithTarget dengan state terkini
    finishNightWithTarget(werewolfTarget, doctorTarget);
  };

// FIX #1: Hunter bisa action dari voting phase
const voteOut = (name: string) => {
  setList(prevList => {
    const votedPlayer = prevList.find(p => p.name === name);
    let next = prevList.map(p => p.name === name ? { ...p, alive: false } : p);
    
    // Werewolf death logic
    if (votedPlayer && votedPlayer.role === "werewolf") {
      winAudio(); // Mainkan WIN.mp3 saat werewolf mati
    }
    
    // Joker logic
    if (votedPlayer && votedPlayer.role === "joker") {
      awardWin([votedPlayer.name]);
      setWinner("Joker Menang!");
      setVictoryAnimation(true); // Tampilkan animasi kemenangan dulu
      return next;
    }
    
    // Cupid logic
    let killedPlayers: string[] = [name];
    let cupidPartner: string | null = null;
    if (couples && (couples[0] === name || couples[1] === name)) {
      const partner = couples[0] === name ? couples[1] : couples[0];
      const partnerPlayer = next.find(p => p.name === partner);
      if (partnerPlayer && partnerPlayer.alive) {
        next = next.map(p => p.name === partner ? { ...p, alive: false } : p);
        killedPlayers.push(partner);
        cupidPartner = partner;
        
        // Check if the partner is a werewolf
        if (partnerPlayer.role === "werewolf") {
          winAudio(); // Mainkan WIN.mp3 saat werewolf mati
        }
      }
    }
    
    const win = checkWin(next);
    if (win) {
      const winners = next.filter(p => win.startsWith("Warga") ? p.role !== "werewolf" : p.role === "werewolf").map(p => p.name);
      awardWin(winners);
      setWinner(win);
      setVictoryAnimation(true); // Tampilkan animasi kemenangan dulu
    } else {
      // FIX #1: Cek apakah voted player adalah hunter
      if (votedPlayer && votedPlayer.role === "hunter") {
        setHunterTriggered(true);
        setHunterDeathByVote(true); // Pemburu tewas karena voting
        // ✅ FIX: Langsung ke hunter phase, bukan voting phase lagi
        setPhase("night-hunter");
      } else {
        // Jika ada pasangan cupid yang mati karena voting, tampilkan pemberitahuan dulu
        if (cupidPartner) {
          setCupidDeathReveal({ player: name, partner: cupidPartner });
        } else {
          setVoteReveal(null);
          setNightStartReveal(true); // Tampilkan panel malam ke-X
        }
      }
    }
    
    return next;
  });
};

  // ✅ FIX #3 & #5: Hapus duplikasi di night-hunter, gunakan reusable function
const executeHunterShot = (targetName: string) => {
  setList(prevList => {
    let next = prevList.map(player => 
      player.name === targetName ? { ...player, alive: false } : player
    );
    
    let killedPlayers: string[] = [targetName];
    let cupidPartner: string | null = null;
    
    if (couples && (couples[0] === targetName || couples[1] === targetName)) {
      const partner = couples[0] === targetName ? couples[1] : couples[0];
      const partnerPlayer = next.find(player => player.name === partner);
      if (partnerPlayer && partnerPlayer.alive) {
        next = next.map(player => player.name === partner ? { ...player, alive: false } : player);
        killedPlayers.push(partner);
        cupidPartner = partner;
      }
    }
    
    const win = checkWin(next);
    if (win) {
      const winners = next.filter(player => win.startsWith("Warga") ? player.role !== "werewolf" : player.role === "werewolf").map(player => player.name);
      awardWin(winners);
      setWinner(win);
      setVictoryAnimation(true); // Tampilkan animasi kemenangan dulu
    } else {
      // Jika ada pasangan cupid yang mati karena hunter, tampilkan pemberitahuan dulu
      if (cupidPartner) {
        setCupidDeathReveal({ player: targetName, partner: cupidPartner });
      } else {
        setVoteReveal(null);
        // ✅ FIX: Setelah hunter action, jika terjadi setelah voting tampilkan panel malam
        if (hunterDeathByVote) {
          setNightStartReveal(true); // Tampilkan panel malam ke-X
        } else {
          setPhase("vote");
        }
      }
    }
    
    return next;
  });
};

// ✅ FIX #6: Werewolf target dari snapshot aliveOf()
const getAliveTargets = () => {
  return list.filter(p => p.alive && p.role !== "werewolf").map(p => p.name);
};

// ✅ FIX #7 & #8: Reset state di reset() dan fix validateConfig
const reset = () => { 
  setPhase("setup"); 
  setList([]); 
  setIdx(0); 
  setWinner(""); 
  setKilled(""); 
  setSeerReveal(null); 
  setCupidReveal(null); 
  setHunterReveal(null); 
  setVoteReveal(null); 
  setCupidDeathReveal(null);
  setNightStartReveal(false);
  setMorningStartReveal(false);
  setHunterDeathReveal(null);
  setVictoryAnimation(false);
  setNightCount(1);
  setWerewolfTarget(""); 
  setDoctorTarget(""); 
  setSeerTarget(""); 
  setCupidSelection([]); 
  setCouples(null); 
  setHunterTarget(""); 
  setHunterTriggered(false);
  setHunterDeathByVote(false); 
  setRoleConfig(getDefaultConfig(players.length));
  setFinalRoleConfig(getDefaultConfig(players.length));
  setLastDoctorTarget("");
};

  const current = list[idx];
  const seerResult = useMemo(() => {
    const t = list.find(p => p.name === seerTarget);
    if (!t) return "";
    return t.role === "werewolf" ? "WEREWOLF 🐺" : "Bukan werewolf 🌿";
  }, [seerTarget, list]);

  const toggleRoleFlip = (roleId: WRole) => {
    setFlippedRole(flippedRole === roleId ? null : roleId);
  };

  const roleLabel = (r: WRole) => ({
    werewolf: "Werewolf 🐺", seer: "Peramal 🔮", doctor: "Dokter ✚", 
    cupid: "Cupid 💘", hunter: "Pemburu 🏹", joker: "Joker 🃏", villager: "Warga 🌿",
  }[r]);

  return (
    <PageFrame title="Werewolf" subtitle="Malam selalu menyimpan rahasia">
      {phase === "setup" && (
        <div className="space-y-4">
          {players.length < 5 ? (
            // Locked state
            <div className="relative">
              <div className="parchment-card rounded-lg p-6 opacity-60">
                <div className="text-center space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-full h-1 bg-ink/30 rotate-45"></div>
                      <div className="w-full h-1 bg-ink/30 -rotate-45"></div>
                    </div>
                    <div className="relative">
                      <span className="text-4xl">🔗</span>
                    </div>
                  </div>
                  <h3 className="font-display text-2xl text-ink">Game Terkunci</h3>
                  <p className="text-destructive font-display text-lg font-bold">Minimal 5 pemain</p>
                  <p className="text-ink/70 italic font-serif-elegant">
                    Werewolf butuh setidaknya 5 pemain untuk gameplay yang seimbang
                  </p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-destructive text-sm font-semibold">
                  Tambahkan {5 - players.length} pemain lagi di Beranda
                </p>
              </div>
            </div>
          ) : (
            // Unlocked state
            <div className="space-y-4">
              <p className="text-foreground/70 italic font-serif-elegant">
                Minimal 5 pemain. Konfigurasikan role sebelum memulai.
              </p>
              <button
                onClick={() => setPhase("role-config")}
                className="w-full h-12 rounded gold-frame bg-mahogany text-gold font-display tracking-widest uppercase hover:-translate-y-0.5 transition-transform"
              >
                Konfigurasi Role ({players.length})
              </button>
            </div>
          )}
        </div>
      )}

      {phase === "role-assignment" && (
        <div className="space-y-4">
          <h2 className="font-display text-2xl text-gold text-center">Ringkasan Role</h2>
          <p className="text-foreground/70 italic font-serif-elegant text-center mb-4">
            Konfigurasi role untuk {players.length} pemain
          </p>
          
          <div className="parchment-card rounded p-4 mb-4">
            <h3 className="font-display text-ink mb-3">Role yang Dipilih</h3>
            <div className="space-y-2 text-sm">
              {ROLES.filter(r => r.id !== "villager").map(role => {
                const count = finalRoleConfig[role.id];
                return count > 0 ? (
                  <div key={role.id} className="flex justify-between">
                    <span>{ROLES.find(r => r.id === role.id)?.icon} {ROLES.find(r => r.id === role.id)?.name}</span>
                    <span className="font-display">{count}</span>
                  </div>
                ) : null;
              })}
              <div className="flex justify-between">
                <span>🌿 Warga</span>
                <span className="font-display">{Math.max(0, players.length - (finalRoleConfig.werewolf + finalRoleConfig.seer + finalRoleConfig.doctor + finalRoleConfig.cupid + finalRoleConfig.hunter + finalRoleConfig.joker))}</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => {
              setList([]); // Reset previous game data
              const roles = buildRolesFromConfig(roleConfig, players.length);
              const order = shuffle(players);
              setList(order.map((p, i) => ({ name: p.name, role: roles[i], alive: true })));
              setIdx(0);
              setPhase("reveal");
              vibrate(50);
            }}
            className="w-full h-12 rounded gold-frame bg-mahogany text-gold font-display tracking-widest uppercase hover:-translate-y-0.5 transition-transform"
          >
            Mulai Permainan
          </button>
        </div>
      )}

      {phase === "werewolf-selection" && (
        <div className="space-y-4">
          <h2 className="font-display text-2xl text-gold text-center">Fase Werewolf</h2>
          <p className="text-foreground/70 italic font-serif-elegant text-center">
            Werewolf, pilih korban malam ini
          </p>
          
          <div className="parchment-card rounded p-4">
            <h3 className="font-display text-ink mb-3">Pilih Korban</h3>
            <div className="grid grid-cols-2 gap-3">
              {aliveOf().filter(p => p.role !== "werewolf").map(p => (
                <button
                  key={p.name}
                  onClick={() => {
                    setWerewolfTarget(p.name);
                    setPhase("night-werewolf");
                    vibrate(50);
                  }}
                  className="parchment-card rounded p-3 hover:-translate-y-0.5 transition-transform"
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">👤</div>
                    <div className="font-display text-ink">{p.name}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {phase === "role-config" && (
        <div className="space-y-4">
          <h2 className="font-display text-2xl text-gold text-center">Konfigurasi Role</h2>
          <p className="text-foreground/70 italic font-serif-elegant text-center">
            Total: {players.length} pemain
          </p>
          
          {/* ✅ FAKSI KEBAIKAN */}
          <div className="space-y-2">
            <h3 className="font-display text-lg text-600">✨ Faksi Kebaikan</h3>
            <div className="space-y-2">
              {ROLES.filter(r => r.faction === "good" && r.id !== "villager").map(role => {
                const roleInfo = ROLES.find(r => r.id === role.id)!;
                const count = roleConfig[role.id];
                const maxCount = roleInfo.maxCount || players.length;
                const isAvailable = !roleInfo.minPlayers || players.length >= roleInfo.minPlayers;
                const isFlipped = flippedRole === role.id;
                
                // ✅ CHECK: Bisa tambah role good faction jika villagers tetap >= 1?
                const totalSpecialRoles = roleConfig.werewolf + roleConfig.seer + roleConfig.doctor + roleConfig.cupid + roleConfig.hunter + roleConfig.joker;
                const currentVillagers = players.length - totalSpecialRoles;
                const canAddGoodRole = currentVillagers > 1; // Jika warga > 1, bisa tambah
                
                return (
                  <div 
                    key={role.id} 
                    className="parchment-card rounded p-3 cursor-pointer relative mb-2"
                    onClick={() => toggleRoleFlip(role.id)}
                    style={{ perspective: "1000px", minHeight: "80px" }}
                  >
                    <div 
                      className={`transition-transform duration-700 transform-style-preserve-3d ${
                        isFlipped ? "rotate-y-180" : ""
                      }`}
                      style={{ 
                        transformStyle: "preserve-3d",
                        transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)"
                      }}
                    >
                      {/* Front of card */}
                      <div 
                        className="backface-hidden absolute inset-0"
                        style={{ backfaceVisibility: "hidden" }}
                      >
                        <div 
                          className="h-full flex items-center px-3"
                          style={{ paddingTop: "25px", paddingBottom: "12px" }}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl flex-shrink-0">{roleInfo.icon}</span>
                              <div className="flex flex-col">
                                <h3 className="font-display text-ink leading-tight">{roleInfo.name}</h3>
                                {!isAvailable && (
                                  <p className="text-xs text-destructive leading-tight">Minimal {roleInfo.minPlayers} pemain</p>
                                )}
                              </div>
                            </div>
                            
                            <div 
                              className="flex items-center gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  const newCount = Math.max(0, count - 1);
                                  setRoleConfig(prev => ({ ...prev, [role.id]: newCount }));
                                }}
                                disabled={count === 0}
                                className="w-8 h-8 rounded bg-mahogany text-gold disabled:opacity-40"
                              >
                                -
                              </button>
                              <span className="w-8 text-center font-display text-ink">{count}</span>
                              <button
                                onClick={() => {
                                  const newCount = Math.min(maxCount, count + 1);
                                  setRoleConfig(prev => ({ ...prev, [role.id]: newCount }));
                                }}
                                disabled={count >= maxCount || !isAvailable || !canAddGoodRole}
                                className="w-8 h-8 rounded bg-mahogany text-gold disabled:opacity-40"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Back of card */}
                      <div 
                        className="absolute inset-0 backface-hidden"
                        style={{ 
                          backfaceVisibility: "hidden",
                          transform: "rotateY(180deg)"
                        }}
                      >
                        <div 
                          className="flex flex-col justify-center h-full"
                          style={{ paddingLeft: "12px", paddingRight: "12px", paddingTop: "27px", paddingBottom: "12px" }}
                        >
                          <p className="text-xs text-ink leading-tight">
                            {roleInfo.detail}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ✅ FAKSI KEJAHATAN */}
          <div className="space-y-2">
            <h3 className="font-display text-lg text-600">🐺 Faksi Kejahatan</h3>
            <div className="space-y-2">
              {ROLES.filter(r => r.faction === "evil").map(role => {
                const roleInfo = ROLES.find(r => r.id === role.id)!;
                const count = roleConfig[role.id];
                const maxCount = roleInfo.maxCount || players.length;
                const isAvailable = !roleInfo.minPlayers || players.length >= roleInfo.minPlayers;
                const isFlipped = flippedRole === role.id;
                
                // ✅ CHECK: Bisa tambah role evil/special jika good faction tetap >= 4?
                const canAdd = canAddRole(roleConfig, role.id, players.length);
                
                return (
                  <div 
                    key={role.id} 
                    className="parchment-card rounded p-3 cursor-pointer relative mb-2"
                    onClick={() => toggleRoleFlip(role.id)}
                    style={{ perspective: "1000px", minHeight: "80px" }}
                  >
                    <div 
                      className={`transition-transform duration-700 transform-style-preserve-3d ${
                        isFlipped ? "rotate-y-180" : ""
                      }`}
                      style={{ 
                        transformStyle: "preserve-3d",
                        transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)"
                      }}
                    >
                      {/* Front of card */}
                      <div 
                        className="backface-hidden absolute inset-0"
                        style={{ backfaceVisibility: "hidden" }}
                      >
                        <div 
                          className="h-full flex items-center px-3"
                          style={{ paddingTop: "25px", paddingBottom: "12px" }}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl flex-shrink-0">{roleInfo.icon}</span>
                              <div className="flex flex-col">
                                <h3 className="font-display text-ink leading-tight">{roleInfo.name}</h3>
                                {!isAvailable && (
                                  <p className="text-xs text-destructive leading-tight">Minimal {roleInfo.minPlayers} pemain</p>
                                )}
                              </div>
                            </div>
                            
                            <div 
                              className="flex items-center gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  const newCount = Math.max(1, count - 1);
                                  setRoleConfig(prev => ({ ...prev, [role.id]: newCount }));
                                }}
                                disabled={count === 1}
                                className="w-8 h-8 rounded bg-mahogany text-gold disabled:opacity-40"
                              >
                                -
                              </button>
                              <span className="w-8 text-center font-display text-ink">{count}</span>
                              <button
                                onClick={() => {
                                  const newCount = Math.min(maxCount, count + 1);
                                  setRoleConfig(prev => ({ ...prev, [role.id]: newCount }));
                                }}
                                disabled={count >= maxCount || !isAvailable || !canAdd}
                                className="w-8 h-8 rounded bg-mahogany text-gold disabled:opacity-40"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Back of card */}
                      <div 
                        className="absolute inset-0 backface-hidden"
                        style={{ 
                          backfaceVisibility: "hidden",
                          transform: "rotateY(180deg)"
                        }}
                      >
                        <div 
                          className="flex flex-col justify-center h-full"
                          style={{ paddingLeft: "12px", paddingRight: "12px", paddingTop: "27px", paddingBottom: "12px" }}
                        >
                          <p className="text-xs text-ink leading-tight">
                            {roleInfo.detail}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ✅ FAKSI KHUSUS */}
          <div className="space-y-2">
            <h3 className="font-display text-lg text-600">🃏 Faksi Khusus</h3>
            <div className="space-y-2">
              {ROLES.filter(r => r.faction === "special").map(role => {
                const roleInfo = ROLES.find(r => r.id === role.id)!;
                const count = roleConfig[role.id];
                const maxCount = roleInfo.maxCount || players.length;
                const isAvailable = !roleInfo.minPlayers || players.length >= roleInfo.minPlayers;
                const isFlipped = flippedRole === role.id;
                
                // ✅ CHECK: Bisa tambah role special jika good faction tetap >= 4?
                const canAdd = canAddRole(roleConfig, role.id, players.length);
                
                return (
                  <div 
                    key={role.id} 
                    className="parchment-card rounded p-3 cursor-pointer relative mb-2"
                    onClick={() => toggleRoleFlip(role.id)}
                    style={{ perspective: "1000px", minHeight: "80px" }}
                  >
                    <div 
                      className={`transition-transform duration-700 transform-style-preserve-3d ${
                        isFlipped ? "rotate-y-180" : ""
                      }`}
                      style={{ 
                        transformStyle: "preserve-3d",
                        transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)"
                      }}
                    >
                      {/* Front of card */}
                      <div 
                        className="backface-hidden absolute inset-0"
                        style={{ backfaceVisibility: "hidden" }}
                      >
                        <div 
                          className="h-full flex items-center px-3"
                          style={{ paddingTop: "25px", paddingBottom: "12px" }}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl flex-shrink-0">{roleInfo.icon}</span>
                              <div className="flex flex-col">
                                <h3 className="font-display text-ink leading-tight">{roleInfo.name}</h3>
                                {!isAvailable && (
                                  <p className="text-xs text-destructive leading-tight">Minimal {roleInfo.minPlayers} pemain</p>
                                )}
                              </div>
                            </div>
                            
                            <div 
                              className="flex items-center gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  const newCount = Math.max(0, count - 1);
                                  setRoleConfig(prev => ({ ...prev, [role.id]: newCount }));
                                }}
                                disabled={count === 0}
                                className="w-8 h-8 rounded bg-mahogany text-gold disabled:opacity-40"
                              >
                                -
                              </button>
                              <span className="w-8 text-center font-display text-ink">{count}</span>
                              <button
                                onClick={() => {
                                  const newCount = Math.min(maxCount, count + 1);
                                  setRoleConfig(prev => ({ ...prev, [role.id]: newCount }));
                                }}
                                disabled={count >= maxCount || !isAvailable || !canAdd}
                                className="w-8 h-8 rounded bg-mahogany text-gold disabled:opacity-40"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Back of card */}
                      <div 
                        className="absolute inset-0 backface-hidden"
                        style={{ 
                          backfaceVisibility: "hidden",
                          transform: "rotateY(180deg)"
                        }}
                      >
                        <div 
                          className="flex flex-col justify-center h-full"
                          style={{ paddingLeft: "12px", paddingRight: "12px", paddingTop: "27px", paddingBottom: "12px" }}
                        >
                          <p className="text-xs text-ink leading-tight">
                            {roleInfo.detail}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="parchment-card rounded p-3">
            <h3 className="font-display text-ink mb-2">Ringkasan Role</h3>
            <div className="space-y-1 text-sm">
              {ROLES.map(role => {
                const totalSpecialRoles = roleConfig.werewolf + roleConfig.seer + roleConfig.doctor + roleConfig.cupid + roleConfig.hunter + roleConfig.joker;
                const count = role.id === "villager" ? 
                  Math.max(0, players.length - totalSpecialRoles) : 
                  roleConfig[role.id];
                return count > 0 ? (
                  <div key={role.id} className="flex justify-between">
                    <span>{role.icon} {role.name}</span>
                    <span className="font-display">{count}</span>
                  </div>
                ) : null;
              })}
            </div>
          </div>
          
          {(() => {
            const validation = validateConfig(roleConfig, players.length);
            return validation ? (
              <p className="text-destructive text-sm text-center">{validation}</p>
            ) : null;
          })()}
          
          <button
            onClick={start}
            disabled={!!validateConfig(roleConfig, players.length)}
            className="w-full h-12 rounded gold-frame bg-mahogany text-gold font-display tracking-widest uppercase disabled:opacity-40"
          >
            Mulai
          </button>
        </div>
      )}

      {phase === "reveal" && current && (
        <motion.div key={idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="text-center">
            <p className="text-xs text-foreground/60 uppercase tracking-widest">Giliran</p>
            <h2 className="font-display text-3xl text-gold">{current.name}</h2>
          </div>
          <div className="parchment-card rounded-lg p-6">
            <HoldToReveal>
              <div className="text-center">
                <p className="text-xs uppercase text-ink/60 mb-1">Peranmu</p>
                <p className="font-display text-3xl text-mahogany">{roleLabel(current.role)}</p>
              </div>
            </HoldToReveal>
          </div>
          <button onClick={nextReveal} className="w-full h-12 rounded gold-frame bg-mahogany text-gold font-display tracking-widest uppercase">
            {idx < list.length - 1 ? "Oper HP" : "Selesai"}
          </button>
        </motion.div>
      )}

      {phase === "night-cupid" && (
        <>
          {!cupidReveal ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
            >
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <h2 className="font-display text-2xl text-gold">Fase Cupid</h2>
                  <NarratorButton text="Malam pertama telah tiba. Cupid, bangunlah dan pilih dua pemain untuk dipertemukan." />
                  <p className="font-serif-elegant italic text-foreground/70 text-sm">Malam pertama telah tiba. Cupid, bangunlah dan pilih dua pemain untuk dipertemukan.</p>
                </div>
                
                {cupidSelection.length === 0 && (
                  <div className="space-y-2">
                    <p className="text-center text-ink font-display">Pilih pemain pertama:</p>
                    {aliveOf().map(p => (
                      <button
                        key={p.name}
                        onClick={() => {
                          setCupidSelection([p.name]);
                          vibrate(30);
                        }}
                        className="w-full parchment-card rounded p-3 font-serif-elegant text-ink text-lg"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
                
                {cupidSelection.length === 1 && (
                  <div className="space-y-2">
                    <p className="text-center text-ink font-display">Pilih pemain kedua:</p>
                    {aliveOf().filter(p => p.name !== cupidSelection[0]).map(p => (
                      <button
                        key={p.name}
                        onClick={() => {
                          const newCouples: [string, string] = [cupidSelection[0], p.name];
                          setCouples(newCouples);
                          setCupidReveal({ player1: cupidSelection[0], player2: p.name });
                          setCupidSelection([]);
                          vibrate([30, 30, 60]);
                        }}
                        className="w-full parchment-card rounded p-3 font-serif-elegant text-ink text-lg"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
              onClick={() => {
                setCupidReveal(null);
                setTimeout(() => {
                  setPhase("night-werewolf");
                }, 150);
              }}
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.15 }}
                className="bg-background border-2 border-ink rounded-lg p-6 max-w-sm mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center space-y-4">
                  <h3 className="font-display text-xl text-gold">💘 Pasangan Cinta Terbentuk 💘</h3>
                  <div className="parchment-card rounded p-4">
                    <p className="text-ink font-display text-lg">{cupidReveal.player1}</p>
                    <p className="text-mahogany font-display text-xl mt-1">&</p>
                    <p className="text-ink font-display text-lg mt-1">{cupidReveal.player2}</p>
                    <p className="text-ink/70 text-sm mt-3 italic">Jika salah satu mati, yang lain akan menyusul</p>
                  </div>
                  <button
                    onClick={() => {
                      setCupidReveal(null);
                      setTimeout(() => {
                        setPhase("night-werewolf");
                      }, 150);
                    }}
                    className="w-full h-10 rounded gold-frame bg-mahogany text-gold font-display tracking-widest uppercase"
                  >
                    Sudah
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </>
      )}

      {phase === "night-werewolf" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          <NightStep
            title="Fase Werewolf"
            narration="Malam telah tiba. Warga harap memejamkan mata. Werewolf, bangunlah dan pilih korbanmu."
            targets={getAliveTargets()}
            onPick={(n) => {
              setWerewolfTarget(n);
              crack();
              vibrate(30);
              
              const nextPhase = getNextPhase("night-werewolf");
              console.log('Werewolf pick:', { target: n, nextPhase });
              
              // ✅ Jika tidak ada fase malam lagi, selesaikan dengan target yang sudah diketahui
              if (nextPhase === "morning") {
                setTimeout(() => {
                  finishNightWithTarget(n, doctorTarget);
                }, 150);
              } else {
                setTimeout(() => setPhase(nextPhase), 150);
              }
            }}
          />
        </motion.div>
      )}

      {phase === "night-seer" && (
        <>
          {!seerReveal ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
            >
              <NightStep
                title="Fase Peramal"
                narration="Werewolf tidur. Peramal, bangun. Pilih satu pemain untuk diintip jati dirinya."
                targets={aliveOf().filter(p => p.role !== "seer").map(p => p.name)}
                onPick={(n) => {
                  setSeerTarget(n);
                  const targetPlayer = list.find(p => p.name === n);
                  if (targetPlayer) {
                    setSeerReveal({ target: n, role: targetPlayer.role });
                    seerSound();
                    vibrate(40);
                  }
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              onAnimationComplete={() => {
                // ✅ SOUND EFFECT DIMAINKAN SAAT PANEL MUNCUL
                seerSound();
              }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
              onClick={() => {
                setSeerReveal(null);
                const nextPhase = getNextPhase("night-seer");
                setTimeout(() => setPhase(nextPhase), 150);
              }}
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.15 }}
                className="bg-background border-2 border-ink rounded-lg p-6 max-w-sm mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center space-y-4">
                  <h3 className="font-display text-xl text-gold">Hasil Intipan Peramal</h3>
                  <div className="parchment-card rounded p-4">
                    <p className="text-ink font-display text-lg">{seerReveal.target}</p>
                    <p className="text-mahogany font-display text-2xl mt-2">
                      {seerReveal.role === "werewolf" ? "WEREWOLF 🐺" : "Bukan Werewolf 🌿"}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSeerReveal(null);
                      const nextPhase = getNextPhase("night-seer");
                      console.log('Seer done:', { nextPhase });
                      
                      // ✅ Jika tidak ada fase malam lagi, selesaikan dengan werewolf target yang sudah disimpan
                      if (nextPhase === "morning") {
                        setTimeout(() => {
                          finishNightWithTarget(werewolfTarget, doctorTarget);
                        }, 150);
                      } else {
                        setTimeout(() => setPhase(nextPhase), 150);
                      }
                    }}
                    className="w-full h-10 rounded gold-frame bg-mahogany text-gold font-display tracking-widest uppercase"
                  >
                    Sudah
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </>
      )}

      {phase === "night-doctor" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          <NightStep
            title="Fase Dokter"
            narration="Peramal tidur. Dokter, bangun. Pilih satu pemain untuk diselamatkan malam ini."
            targets={aliveOf().map(p => p.name)}
            onPick={(n) => {
              // ✅ FIX #4: Jangan izinkan dokter selamatkan target yang sama dua malam berturut-turut
              if (n === lastDoctorTarget) {
                alert("Dokter tidak bisa selamatkan orang yang sama dua malam berturut-turut!");
                return;
              }
              
              setDoctorTarget(n);
              setLastDoctorTarget(n);
              setTimeout(() => {
                finishNightWithTarget(werewolfTarget, n);
              }, 150);
            }}
          />
        </motion.div>
      )}

      {phase === "night-hunter" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <h2 className="font-display text-2xl text-gold">Fase Pemburu</h2>
              <NarratorButton text={hunterDeathByVote ? "Pemburu digantung warga! Pemburu, bangunlah dan pilih satu orang untuk dibawa mati bersamamu." : "Pemburu telah dibunuh! Pemburu, bangunlah dan pilih satu orang untuk dibawa mati bersamamu."} />
              <p className="font-serif-elegant italic text-foreground/70 text-sm">
                {hunterDeathByVote ? "Pemburu digantung oleh warga! Pemburu, bangunlah dan pilih satu orang untuk dibawa mati bersamamu." : "Pemburu telah dibunuh oleh werewolf! Pemburu, bangunlah dan pilih satu orang untuk dibawa mati bersamamu."}
              </p>
            </div>
            
            <div className="space-y-2">
              <p className="text-center text-ink font-display">Pilih target:</p>
              {aliveOf().map(p => (
                <button
                  key={p.name}
                  onClick={() => {
                    const targetPlayer = list.find(player => player.name === p.name);
                    if (targetPlayer) {
                      // Check if hunter is killing a werewolf
                      if (targetPlayer.role === "werewolf") {
                        winAudio(); // Mainkan WIN.mp3 saat werewolf mati
                      }
                      
                      // Execute hunter action directly
                      setList(prevList => {
                        let next = prevList.map(player => 
                          player.name === p.name ? { ...player, alive: false } : player
                        );
                        
                        // 💘 Cupid logic: if the hunter's target is in a couple, kill their partner too
                        let killedPlayers: string[] = [p.name];
                        
                        if (couples && (couples[0] === p.name || couples[1] === p.name)) {
                          const partner = couples[0] === p.name ? couples[1] : couples[0];
                          const partnerPlayer = next.find(player => player.name === partner);
                          
                          if (partnerPlayer && partnerPlayer.alive) {
                            next = next.map(player => player.name === partner ? { ...player, alive: false } : player);
                            killedPlayers.push(partner);
                            console.log('Cupid partner died from hunter shot:', partner);
                            
                            // Check if the partner is a werewolf
                            if (partnerPlayer.role === "werewolf") {
                              winAudio(); // Mainkan WIN.mp3 saat werewolf mati
                            }
                          }
                        }
                        
                        const win = checkWin(next);
                        if (win) {
                          const winners = next.filter(player => win.startsWith("Warga") ? player.role !== "werewolf" : player.role === "werewolf").map(player => player.name);
                          awardWin(winners);
                          setWinner(win);
                          setVictoryAnimation(true); // Tampilkan animasi kemenangan dulu
                        } else {
                          setVoteReveal(null); // Reset voting reveal state
                          // Selalu tampilkan panel pemburu death reveal
                          setHunterDeathReveal({ 
                            hunter: list.find(p => p.role === "hunter" && !p.alive)?.name || "",
                            target: p.name,
                            targetRole: targetPlayer.role
                          });
                        }
                        
                        return next;
                      });
                      
                      setHunterReveal(null);
                      setHunterTarget("");
                      setHunterTriggered(false);
                      // Jangan reset hunterDeathByVote agar tetap tersedia untuk panel pemburu death reveal
                      vibrate(40);
                    }
                  }}
                  className="w-full parchment-card rounded p-3 font-serif-elegant text-ink text-lg"
                >
                  Bawa {p.name} mati
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      
      {phase === "vote" && (
        <>
          {!voteReveal ? (
            <div className="space-y-3">
              <p className="text-center italic text-foreground/70">Diskusi & gantung tersangka:</p>
              {aliveOf().map(p => (
                <button
                  key={p.name}
                  onClick={() => {
                    const votedPlayer = list.find(player => player.name === p.name);
                    if (votedPlayer) {
                      setVoteReveal({ target: p.name, role: votedPlayer.role });
                      vibrate(40);
                    }
                  }}
                  className="w-full parchment-card rounded p-3 font-serif-elegant text-ink text-lg"
                >
                  Gantung {p.name}
                </button>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              onAnimationComplete={() => {
                // ✅ SOUND EFFECT DIMAINKAN SAAT PANEL MUNCUL (BUKAN SAAT KLIK)
                if (voteReveal) {
                  if (voteReveal.role === "werewolf") {
                    winAudio(); // ✅ Warga menang - werewolf tergantung
                  } else {
                    failed(); // ✅ Warga gagal - bukan werewolf
                  }
                }
              }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
              onClick={() => {
                // Execute the vote
                if (voteReveal) {
                  voteOut(voteReveal.target);
                }
              }}
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.15 }}
                className="bg-background border-2 border-ink rounded-lg p-6 max-w-sm mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center space-y-4">
                  <h3 className="font-display text-xl text-gold">🗳️ Hasil Voting</h3>
                  <div className="parchment-card rounded p-4">
                    <p className="text-ink font-display text-lg">{voteReveal.target}</p>
                    <p className="text-mahogany font-display text-2xl mt-2">
                      {voteReveal.role === "werewolf" ? "WEREWOLF 🐺" : 
                       voteReveal.role === "seer" ? "PERAMAL 🔮" :
                       voteReveal.role === "doctor" ? "DOKTER 🥼" :
                       voteReveal.role === "cupid" ? "CUPID 💘" :
                       voteReveal.role === "hunter" ? "PEMBURU 🏹" :
                       voteReveal.role === "joker" ? "JOKER 🃏" : "WARGA 🌿"}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      // Execute the vote (TANPA SOUND - sudah dimainkan di onAnimationComplete)
                      if (voteReveal) {
                        voteOut(voteReveal.target);
                      }
                    }}
                    className="w-full h-10 rounded gold-frame bg-mahogany text-gold font-display tracking-widest uppercase"
                  >
                    {voteReveal.role === "hunter" ? "Fase Pemburu" : "Ya"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </>
      )}

      {cupidDeathReveal && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          onAnimationComplete={() => {
            // Sound effect untuk patah hati (kematian)
            crack();
          }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => {
            setCupidDeathReveal(null);
            setVoteReveal(null);
            setPhase("night-werewolf");
          }}
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.15 }}
            className="bg-background border-2 border-ink rounded-lg p-6 max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-4">
              <h3 className="font-display text-xl text-gold">💔 Patah Hati</h3>
              <div className="parchment-card rounded p-4">
                <p className="text-ink font-serif-elegant text-lg">
                  {cupidDeathReveal.player} ternyata berpasangan dengan {cupidDeathReveal.partner}!
                </p>
                <div className="mt-3 space-y-1">
                  {(() => {
                    const player1 = list.find(p => p.name === cupidDeathReveal.player);
                    const player2 = list.find(p => p.name === cupidDeathReveal.partner);
                    const role1 = player1 ? roleLabel(player1.role) : "";
                    const role2 = player2 ? roleLabel(player2.role) : "";
                    
                    return (
                      <>
                        <p className="text-ink font-serif-elegant text-sm">
                          {cupidDeathReveal.player} adalah {role1}
                        </p>
                        <p className="text-ink font-serif-elegant text-sm">
                          {cupidDeathReveal.partner} adalah {role2}
                        </p>
                      </>
                    );
                  })()}
                </div>
                <p className="text-mahogany font-display text-lg mt-3">
                  💘 Pasangannya patah hati dan ikut mati
                </p>
              </div>
              <button
                onClick={() => {
                  setCupidDeathReveal(null);
                  setVoteReveal(null);
                  // Tentukan fase berikutnya berdasarkan fase saat ini:
                  // - voting -> tampilkan panel malam ke-X
                  // - werewolf -> tampilkan panel pagi
                  // - hunter -> sesuai hunterDeathByVote
                  if (phase === "vote") {
                    setNightStartReveal(true); // Tampilkan panel malam ke-X
                  } else if (phase === "night-hunter") {
                    setPhase(hunterDeathByVote ? "night-werewolf" : "vote");
                  } else {
                    setMorningStartReveal(true); // Tampilkan panel pagi
                  }
                }}
                className="w-full h-10 rounded gold-frame bg-mahogany text-gold font-display tracking-widest uppercase"
              >
                Lanjut
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {nightStartReveal && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          onAnimationComplete={() => {
            // Sound effect untuk malam tiba
            howlSound();
          }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => {
            setNightStartReveal(false);
            // ✅ GUNAKAN finalRoleConfig untuk menentukan fase berikutnya
            const hasCupid = list.some(p => p.role === "cupid" && p.alive) || finalRoleConfig.cupid > 0;
            if (hasCupid) {
              setPhase("night-cupid"); 
            } else {
              setPhase("night-werewolf");
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.15 }}
            className="bg-background border-2 border-ink rounded-lg p-6 max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-4">
              <h3 className="font-display text-xl text-gold">🌙 Malam ke-{nightCount} Telah Tiba</h3>
              <div className="parchment-card rounded p-4">
                <p className="text-ink font-serif-elegant text-lg">
                  {nightCount === 1 
                    ? "Semua pemain telah mengetahui perannya. Malam telah tiba, waktu untuk role khusus untuk melakukan aksi."
                    : "Malam telah tiba kembali. Waktu untuk role khusus untuk melakukan aksi."
                  }
                </p>
              </div>
              <button
                onClick={() => {
                  setNightStartReveal(false);
                  // ✅ Increment nightCount setiap kali malam baru dimulai
                  setNightCount(prev => prev + 1);
                  // ✅ Cupid hanya melakukan aksi di malam pertama
                  const hasCupid = list.some(p => p.role === "cupid" && p.alive) || finalRoleConfig.cupid > 0;
                  const isFirstNight = nightCount === 1;
                  if (hasCupid && isFirstNight) {
                    setPhase("night-cupid"); 
                  } else {
                    setPhase("night-werewolf");
                  }
                }}
                className="w-full h-10 rounded gold-frame bg-mahogany text-gold font-display tracking-widest uppercase"
              >
                Mulai Malam
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {morningStartReveal && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          onAnimationComplete={() => {
            // Sound effect untuk pagi tiba
            roosterSound();
          }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => {
            setMorningStartReveal(false);
            setPhase("vote");
          }}
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.15 }}
            className="bg-background border-2 border-ink rounded-lg p-6 max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-4">
              <h3 className="font-display text-xl text-gold">🌅 Pagi Telah Tiba</h3>
              <div className="parchment-card rounded p-4">
                {killed ? (
                  <div className="text-center">
                    {(() => {
                      const killedNames = killed.split(" & ");
                      
                      // Cek apakah ini adalah pasangan cupid yang mati
                      if (killedNames.length === 2 && couples) {
                        const [name1, name2] = killedNames;
                        const isCupidCouple = (couples[0] === name1 && couples[1] === name2) || 
                                           (couples[0] === name2 && couples[1] === name1);
                        
                        if (isCupidCouple) {
                          // Format khusus untuk pasangan cupid: tanpa role
                          return `${name1} dan ${name2} ditemukan tak bernyawa di pagi hari`;
                        }
                      }
                      
                      // Format normal dengan role untuk kasus lain
                      const messages = killedNames.map(name => {
                        const player = list.find(p => p.name === name && !p.alive);
                        const roleText = player ? roleLabel(player.role) : "";
                        return `${name} ditemukan tak bernyawa dan role dia adalah ${roleText}`;
                      });
                      return messages.join(" & ");
                    })()}
                  </div>
                ) : (
                  <p className="text-ink font-serif-elegant text-lg">
                    {list.some(p => p.role === "doctor" && p.alive) 
                      ? "Dokter menyelamatkan nyawa malam ini. Matahari telah terbit."
                      : "Malam berlalu dengan damai. Matahari telah terbit."}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setMorningStartReveal(false);
                  // Jika hunter yang mati, masuk ke fase hunter, bukan voting
                  if (hunterTriggered) {
                    setPhase("night-hunter");
                  } else {
                    setPhase("vote");
                  }
                }}
                className="w-full h-10 rounded gold-frame bg-mahogany text-gold font-display tracking-widest uppercase"
              >
                {hunterTriggered ? "Fase Pemburu" : "Mulai Voting"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {hunterDeathReveal && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          onAnimationComplete={() => {
            // Sound effect untuk hunter action
            crack();
          }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => {
            setHunterDeathReveal(null);
            setPhase("vote"); // Langsung ke voting
          }}
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.15 }}
            className="bg-background border-2 border-ink rounded-lg p-6 max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-4">
              <h3 className="font-display text-xl text-gold">🏹 Pemburu Membawa Korban</h3>
              <div className="parchment-card rounded p-4">
                <p className="text-ink font-serif-elegant text-lg">
                  {hunterDeathReveal.hunter} membawa {hunterDeathReveal.target} untuk mati bersama dan role dia adalah {roleLabel(hunterDeathReveal.targetRole as WRole)}!
                </p>
              </div>
              <button
                onClick={() => {
                  setHunterDeathReveal(null);
                  // Jika pemburu tewas karena voting, lanjut ke fase malam
                  // Jika pemburu tewas karena werewolf, langsung ke voting
                  if (hunterDeathByVote) {
                    setNightStartReveal(true); // Tampilkan panel malam
                  } else {
                    setPhase("vote"); // Langsung ke voting
                  }
                  // Reset hunterDeathByVote setelah digunakan
                  setHunterDeathByVote(false);
                }}
                className="w-full h-10 rounded gold-frame bg-mahogany text-gold font-display tracking-widest uppercase"
              >
                Lanjut
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {victoryAnimation && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0, rotate: 0 }}
            animate={{ 
              scale: [0, 1.2, 1], 
              rotate: [0, 360, 0],
              opacity: [0, 1, 1]
            }}
            transition={{ 
              duration: 2,
              times: [0, 0.5, 1],
              ease: "easeInOut"
            }}
            onAnimationComplete={() => {
              // Sound effect untuk kemenangan
              victory();
              setTimeout(() => {
                setVictoryAnimation(false);
                setPhase("end");
              }, 1000);
            }}
            className="relative"
          >
            {/* Background glow effect */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 2, 1.5], 
                opacity: [0, 0.8, 0]
              }}
              transition={{ 
                duration: 2,
                times: [0, 0.3, 1],
                ease: "easeOut"
              }}
              className="absolute inset-0 w-64 h-64 bg-gradient-to-r from-gold via-yellow-400 to-gold rounded-full blur-3xl"
            />
            
            {/* Victory icon */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 1.5, 1], 
                opacity: [0, 1, 1]
              }}
              transition={{ 
                duration: 1.5,
                times: [0, 0.3, 1],
                ease: "easeOut"
              }}
              className="relative bg-background border-4 border-gold rounded-full w-32 h-32 flex items-center justify-center shadow-2xl"
            >
              <motion.span
                initial={{ rotate: 0 }}
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, ease: "linear", repeat: Infinity }}
                className="text-6xl"
              >
                👑
              </motion.span>
            </motion.div>
            
            {/* Victory text */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ 
                y: [50, 0, 0], 
                opacity: [0, 1, 1]
              }}
              transition={{ 
                duration: 1.5,
                times: [0, 0.5, 1],
                ease: "easeOut"
              }}
              className="absolute -bottom-20 left-1/2 transform -translate-x-1/2 text-center"
            >
              <h2 className="font-display text-3xl text-gold font-bold drop-shadow-lg">
                {winner}
              </h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 1] }}
                transition={{ 
                  duration: 1,
                  delay: 0.5,
                  ease: "easeOut"
                }}
                className="text-gold/80 font-serif-elegant mt-2"
              >
                Selamat! 🎉
              </motion.p>
            </motion.div>
            
            {/* Particle effects */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: 0, 
                  y: 0, 
                  opacity: 0,
                  scale: 0
                }}
                animate={{
                  x: Math.cos((i * Math.PI * 2) / 8) * 150,
                  y: Math.sin((i * Math.PI * 2) / 8) * 150,
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0]
                }}
                transition={{
                  duration: 2,
                  times: [0, 0.3, 1],
                  ease: "easeOut"
                }}
                className="absolute top-1/2 left-1/2 w-4 h-4"
              >
                <div className="w-full h-full bg-gradient-to-r from-gold to-yellow-400 rounded-full" />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}

      
      {phase === "end" && (
        <div className="text-center space-y-4">
          <h2 className="font-display text-3xl text-gold">{winner}</h2>
          <div className="parchment-card rounded p-4 text-left">
            <ul className="space-y-1 font-serif-elegant text-ink">
              {list.map(p => (
                <li key={p.name} className="flex justify-between">
                  <span>{p.name} {p.alive ? "" : "💀"}</span>
                  <span className="italic">{roleLabel(p.role)}</span>
                </li>
              ))}
            </ul>
          </div>
          <button onClick={reset} className="w-full h-12 rounded gold-frame bg-mahogany text-gold font-display tracking-widest uppercase">
            Main Lagi
          </button>
        </div>
      )}
    </PageFrame>
  );
}

function NightStep({
  title, narration, targets, onPick, continueLabel, onContinue,
}: {
  title: string; narration: string; targets: string[];
  onPick: (n: string) => void; continueLabel?: string; onContinue?: () => void;
}) {
  const [picked, setPicked] = useState<string>("");
  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h2 className="font-display text-2xl text-gold">{title}</h2>
        <NarratorButton text={narration} />
        <p className="font-serif-elegant italic text-foreground/70 text-sm">{narration}</p>
      </div>
      <div className="space-y-2">
        {targets.map(n => (
          <button
            key={n}
            onClick={() => { setPicked(n); onPick(n); }}
            className={`w-full parchment-card rounded p-3 font-serif-elegant text-ink text-lg ${picked === n ? "ring-2 ring-deep-green" : ""}`}
          >
            {n}
          </button>
        ))}
      </div>
      {onContinue && continueLabel && (
        <button onClick={onContinue} className="w-full h-10 rounded gold-frame bg-mahogany text-gold font-display tracking-widest uppercase">
          {continueLabel}
        </button>
      )}
    </div>
  );
}
