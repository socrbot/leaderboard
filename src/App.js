import React from "react";
import "./App.css";

const leaderboardData = [
  {
    team: "Ash",
    total: -27,
    r1: 62,
    r2: 66,
    r3: 61,
    r4: null,
    golfers: [
      { name: "Golfer 1", r1: 68, r2: 70, r3: 65, r4: null },
      { name: "Golfer 2", r1: 65, r2: 67, r3: 62, r4: null },
      { name: "Golager 3", r1: 72, r2: 69, r3: 70, r4: null },
      { name: "Golfer 4", r1: 64, r2: 66, r3: 63, r4: null },
    ],
  },
  {
    team: "Wittig",
    total: -24,
    r1: 63,
    r2: 69,
    r3: 60,
    r4: null,
    golfers: [
      { name: "Jake Knapp", r1: 66, r2: 71, r3: 60, r4: null },
      { name: "Frankie Capan III", r1: 67, r2: 68, r3: 60, r4: null },
      { name: "Golfer A", r1: 70, r2: 72, r3: 68, r4: null },
      { name: "Golfer B", r1: 68, r2: 70, r3: 65, r4: null },
    ],
  },
  {
    team: "Dingo",
    total: -24,
    r1: 62,
    r2: 69,
    r3: 61,
    golfers: [
      { name: "Ryo Hisatsune", r1: 64, r2: 70, r3: 62, r4: null },
      { name: "Takumi Kanaya", r1: 66, r2: 69, r3: 64, r4: null },
      { name: "Golfer X", r1: 69, r2: 71, r3: 67, r4: null },
      { name: "Golfer Y", r1: 67, r2: 69, r3: 66, r4: null },
    ],
  },
  {
    team: "Coop",
    total: -23,
    r1: 59,
    r2: 70,
    r3: 64,
    r4: null,
    golfers: [
      { name: "Nicolai Højgaard", r1: 60, r2: 72, r3: 65, r4: null },
      { name: "Rasmus Højgaard", r1: 61, r2: 68, r3: 66, r4: null },
      { name: "Golfer P", r1: 63, r2: 70, r3: 68, r4: null },
      { name: "Golfer Q", r1: 65, r2: 69, r3: 67, r4: null },
    ],
  },
  {
    team: "Decs",
    total: -23,
    r1: 58,
    r2: 69,
    r3: 66,
    r4: null,
    golfers: [
      { name: "Isaiah Salinda", r1: 60, r2: 70, r3: 68, r4: null },
      { name: "Kevin Velo", r1: 59, r2: 69, r3: 67, r4: null },
      { name: "Golfer K", r1: 62, r2: 71, r3: 69, r4: null },
      { name: "Golfer L", r1: 61, r2: 68, r3: 66, r4: null },
    ],
  },
	{
		team: "Rusty",
		total: -23,
		r1: 59,
		r2: 70,
		r3: 64,
		r4: null,
		golfers: [
		  { name: "Nicolai Højgaard", r1: 60, r2: 72, r3: 65, r4: null },
		  { name: "Rasmus Højgaard", r1: 61, r2: 68, r3: 66, r4: null },
		  { name: "Golfer P", r1: 63, r2: 70, r3: 68, r4: null },
		  { name: "Golfer Q", r1: 65, r2: 69, r3: 67, r4: null },
		],
	  },
	  {
		team: "Brooks",
		total: -23,
		r1: 59,
		r2: 70,
		r3: 64,
		r4: null,
		golfers: [
		  { name: "Nicolai Højgaard", r1: 60, r2: 72, r3: 65, r4: null },
		  { name: "Rasmus Højgaard", r1: 61, r2: 68, r3: 66, r4: null },
		  { name: "Golfer P", r1: 63, r2: 70, r3: 68, r4: null },
		  { name: "Golfer Q", r1: 65, r2: 69, r3: 67, r4: null },
		],
	  },
	  {
		team: "Nobes",
		total: -23,
		r1: 59,
		r2: 70,
		r3: 64,
		r4: null,
		golfers: [
		  { name: "Nicolai Højgaard", r1: 60, r2: 72, r3: 65, r4: null },
		  { name: "Rasmus Højgaard", r1: 61, r2: 68, r3: 66, r4: null },
		  { name: "Golfer P", r1: 63, r2: 70, r3: 68, r4: null },
		  { name: "Golfer Q", r1: 65, r2: 69, r3: 67, r4: null },
		],
	  },
	  {
		team: "Jonny",
		total: -23,
		r1: 59,
		r2: 70,
		r3: 64,
		r4: null,
		golfers: [
		  { name: "Nicolai Højgaard", r1: 60, r2: 72, r3: 65, r4: null },
		  { name: "Rasmus Højgaard", r1: 61, r2: 68, r3: 66, r4: null },
		  { name: "Golfer P", r1: 63, r2: 70, r3: 68, r4: null },
		  { name: "Golfer Q", r1: 65, r2: 69, r3: 67, r4: null },
		],
	  },
	  {
		team: "PC",
		total: -23,
		r1: 59,
		r2: 70,
		r3: 64,
		r4: null,
		golfers: [
		  { name: "Nicolai Højgaard", r1: 60, r2: 72, r3: 65, r4: null },
		  { name: "Rasmus Højgaard", r1: 61, r2: 68, r3: 66, r4: null },
		  { name: "Golfer P", r1: 63, r2: 70, r3: 68, r4: null },
		  { name: "Golfer Q", r1: 65, r2: 69, r3: 67, r4: null },
		],
	  },
	  {
		team: "Strats",
		total: -23,
		r1: 59,
		r2: 70,
		r3: 64,
		r4: null,
		golfers: [
		  { name: "Nicolai Højgaard", r1: 60, r2: 72, r3: 65, r4: null },
		  { name: "Rasmus Højgaard", r1: 61, r2: 68, r3: 66, r4: null },
		  { name: "Golfer P", r1: 63, r2: 70, r3: 68, r4: null },
		  { name: "Golfer Q", r1: 65, r2: 69, r3: 67, r4: null },
		],
	  },
];

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>WVU Alumni Leaderboard</h1>
      </header>
      <main>
        <table>
          <thead>
            <tr>
               <th>TEAM / GOLFER</th> {/* Changed for clarity */}
              <th>TOTAL</th>
              <th>R1</th>
              <th>R2</th>
              <th>R3</th>
              <th>R4</th>
            </tr>
          </thead>
		  
		  <tbody>
			 {leaderboardData.map((team, index) => (
			   <React.Fragment key={`team-${index}`}>
				 {/* Team Row with dynamic class */}
				 <tr className={`team-row team-${team.team.replace(/[^a-zA-Z0-9]/g, '')}`}>
				   <td>{team.team}</td>
				   <td className="total">{team.total}</td>
				   <td>{team.r1}</td>
				   <td>{team.r2}</td>
				   <td>{team.r3}</td>
				   <td>{team.r4 || "-"}</td>
				   
				 </tr>
				 {/* Golfer Sub-rows */}
				 {team.golfers && team.golfers.map((golfer, golferIndex) => (
				   <tr key={`golfer-<span class="math-inline">\{index\}\-</span>{golferIndex}`} className="golfer-row">
					 
					 <td>{golfer.name}</td>
					 <td></td>
					 <td>{golfer.r1 || "-"}</td>
					 <td>{golfer.r2 || "-"}</td>
					 <td>{golfer.r3 || "-"}</td>
					 <td>{golfer.r4 || "-"}</td>
					 				   </tr>
				 ))}
			   </React.Fragment>
			 ))}
			</tbody>
          
        </table>
      </main>
    </div>
  );
}

export default App;